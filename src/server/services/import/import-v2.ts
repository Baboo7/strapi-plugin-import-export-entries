import cloneDeep from 'lodash/cloneDeep';
import isEmpty from 'lodash/isEmpty';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import { toArray } from '../../../libs/arrays';
import { ObjectBuilder } from '../../../libs/objects';
import { getEntryProp, getModel, getModelAttributes } from '../../utils/models';
import { SchemaUID } from '@strapi/strapi/lib/types/utils';
import { Entry, EntryId } from '../../types';
const { findOrImportFile } = require('./utils/file');

type Import = {
  version: 2;
  data: ImportData;
};
type ImportData = ImportDataSlugEntries;
type ImportDataSlugEntries = {
  [slug in SchemaUID]: {
    [key: string]: {
      [attribute: string]: string | number | string[] | number[] | null;
    };
  };
};

type ImportFailures = {
  /** Error raised. */
  error: Error;
  /** Data for which import failed. */
  data: any;
};

type User = any;

/**
 * Import data.
 * @returns {Promise<ImportDataRes>}
 */
const importDataV2 = async (
  fileContent: Import,
  {
    slug,
    user,
    idField,
  }: {
    slug: SchemaUID;
    /** User importing the data. */
    user: User;
    /** Field used as unique identifier. */
    idField: string;
  },
) => {
  const { data } = fileContent;

  const slugs: SchemaUID[] = Object.keys(data) as SchemaUID[];
  let failures: ImportFailures[] = [];
  // Import without setting relations.
  for (const slugFromFile of slugs) {
    if (slugFromFile === 'plugin::upload.file') {
      const res = await importMedia(Object.values(data[slugFromFile]) as unknown as Entry[], { user });
      failures.push(...res.failures);
    } else {
      const res = await importOtherSlug(Object.values(data[slugFromFile]) as unknown as Entry[], {
        slug: slugFromFile,
        user,
        // Keep behavior of `idField` of version 1.
        ...(slugFromFile === slug ? { idField } : {}),
        importStage: 'simpleAttributes',
      });
      failures.push(...res.failures);
    }
  }

  // Set relations relations.
  for (const slugFromFile of slugs) {
    if (slugFromFile === 'plugin::upload.file') {
      // TODO: are media imported twice?
      const res = await importMedia(Object.values(data[slugFromFile]) as unknown as Entry[], { user });
      failures.push(...res.failures);
    } else {
      const res = await importOtherSlug(Object.values(data[slugFromFile]) as unknown as Entry[], {
        slug: slugFromFile,
        user,
        // Keep behavior of `idField` of version 1.
        ...(slugFromFile === slug ? { idField } : {}),
        importStage: 'relationAttributes',
      });
      failures.push(...res.failures);
    }
  }

  // Sync primary key sequence for postgres databases.
  // See https://github.com/strapi/strapi/issues/12493.
  // TODO: improve strapi typing
  if ((strapi.db as any).config.connection.client === 'postgres') {
    for (const slugFromFile of slugs) {
      const model = getModel(slugFromFile);
      await strapi.db.connection.raw(`SELECT SETVAL((SELECT PG_GET_SERIAL_SEQUENCE('${model.collectionName}', 'id')), (SELECT MAX(id) FROM ${model.collectionName}) + 1, FALSE);`);
    }
  }

  return { failures };
};

const importMedia = async (fileData: Entry[], { user }: { user: User }): Promise<{ failures: ImportFailures[] }> => {
  const failures: ImportFailures[] = [];
  for (let fileDatum of fileData) {
    let res;
    try {
      await findOrImportFile(fileDatum, user, { allowedFileTypes: ['any'] });
    } catch (err: any) {
      strapi.log.error(err);
      failures.push({ error: err.message, data: fileDatum });
    }
  }

  return {
    failures,
  };
};

type ImportStage = 'simpleAttributes' | 'relationAttributes';

const importOtherSlug = async (
  data: Entry[],
  { slug, user, idField, importStage }: { slug: SchemaUID; user: User; idField?: string; importStage: ImportStage },
): Promise<{ failures: ImportFailures[] }> => {
  // Sort localized data with default locale first.
  const sortDataByLocale = async () => {
    const schema = getModel(slug);

    if (schema.pluginOptions?.i18n?.localized) {
      const defaultLocale = await strapi.plugin('i18n').service('locales').getDefaultLocale();
      data = data.sort((dataA, dataB) => {
        if (dataA?.locale === defaultLocale && dataB?.locale === defaultLocale) {
          return 0;
        } else if (dataA?.locale === defaultLocale) {
          return -1;
        }
        return 1;
      });
    }
  };
  await sortDataByLocale();

  const failures: ImportFailures[] = [];
  for (let datum of data) {
    try {
      await updateOrCreate(user, slug, datum, idField, { importStage });
    } catch (err: any) {
      strapi.log.error(err);
      failures.push({ error: err.message, data: datum });
    }
  }

  return {
    failures,
  };
};

const updateOrCreate = async (user: User, slug: SchemaUID, datumArg: Entry, idField = 'id', { importStage }: { importStage: ImportStage }) => {
  const schema = getModel(slug);
  let datum = cloneDeep(datumArg);

  if (importStage == 'simpleAttributes') {
    const attributeNames = getModelAttributes(slug, { filterOutType: ['component', 'dynamiczone', 'media', 'relation'] })
      .map(({ name }) => name)
      .concat('id', 'localizations', 'locale');
    datum = pick(datum, attributeNames) as Entry;
  } else if (importStage === 'relationAttributes') {
    const attributeNames = getModelAttributes(slug, { filterType: ['component', 'dynamiczone', 'media', 'relation'] })
      .map(({ name }) => name)
      .concat('id', 'localizations', 'locale');
    datum = pick(datum, attributeNames) as Entry;
  }

  // TODO: handle components create or update?
  if (schema.modelType === 'contentType' && schema.kind === 'singleType') {
    await updateOrCreateSingleTypeEntry(user, slug, datum, { importStage });
  } else {
    await updateOrCreateEntry(user, slug, datum, { idField, importStage });
  }
};

const updateOrCreateEntry = async (user: User, slug: SchemaUID, datum: Entry, { idField, importStage }: { idField: string; importStage: ImportStage }) => {
  const schema = getModel(slug);

  const whereBuilder = new ObjectBuilder();
  if (getEntryProp(datum, idField)) {
    whereBuilder.extend({ [idField]: getEntryProp(datum, idField) });
  }
  const where = whereBuilder.get();

  if (!schema.pluginOptions?.i18n?.localized) {
    let entry = await strapi.db.query(slug).findOne({ where });

    if (!entry) {
      await strapi.entityService.create(slug, { data: datum });
    } else {
      await updateEntry(slug, entry.id, datum, { importStage });
    }
  } else {
    if (!datum.locale) {
      throw new Error(`No locale set to import entry for slug ${slug} (data ${JSON.stringify(datum)})`);
    }

    const defaultLocale = await strapi.plugin('i18n').service('locales').getDefaultLocale();
    const isDatumInDefaultLocale = datum.locale === defaultLocale;

    let entryDefaultLocale = null;
    let entry = await strapi.db.query(slug).findOne({ where, populate: ['localizations'] });
    if (isDatumInDefaultLocale) {
      entryDefaultLocale = entry;
    } else {
      if (entry) {
        // If `entry` has been found, `entry` holds the data for the default locale and
        // the data for other locales in its `localizations` attribute.
        const localizedEntries = [entry, ...(entry?.localizations || [])];
        entryDefaultLocale = localizedEntries.find((e) => e.locale === defaultLocale);
        entry = localizedEntries.find((e) => e.locale === datum.locale);
      } else {
        // Otherwise try to find entry for default locale through localized siblings.
        let localizationIdx = 0;
        const localizations = datum?.localizations || [];
        while (localizationIdx < localizations.length && !entryDefaultLocale && !entry) {
          const id = localizations[localizationIdx];
          const localizedEntry = await strapi.db.query(slug).findOne({ where: { id }, populate: ['localizations'] });
          const localizedEntries = localizedEntry != null ? [localizedEntry, ...(localizedEntry?.localizations || [])] : [];
          if (!entryDefaultLocale) {
            entryDefaultLocale = localizedEntries.find((e) => e.locale === defaultLocale);
          }
          if (!entry) {
            entry = localizedEntries.find((e) => e.locale === datum.locale);
          }
          localizationIdx += 1;
        }
      }
    }

    datum = omit(datum, ['localizations']);
    if (isEmpty(omit(datum, ['id']))) {
      return;
    }

    if (isDatumInDefaultLocale) {
      if (!entryDefaultLocale) {
        await strapi.entityService.create(slug, { data: datum });
      } else {
        await strapi.entityService.update(slug, entryDefaultLocale.id, { data: omit({ ...datum }, ['id']) });
      }
    } else {
      if (!entryDefaultLocale) {
        throw new Error(`Could not find default locale entry to import localization for slug ${slug} (data ${JSON.stringify(datum)})`);
      }

      if (!entry) {
        const insertLocalizedEntry = strapi.plugin('i18n').service('core-api').createCreateLocalizationHandler(getModel(slug));
        await insertLocalizedEntry({ id: entryDefaultLocale.id, data: omit({ ...datum }, ['id']) });
      } else {
        await strapi.entityService.update(slug, entry.id, { data: omit({ ...datum }, ['id']) });
      }
    }
  }
};

const updateOrCreateSingleTypeEntry = async (user: User, slug: SchemaUID, datum: Entry, { importStage }: { importStage: ImportStage }) => {
  const schema = getModel(slug);

  if (!schema.pluginOptions?.i18n?.localized) {
    let entry: Entry = await strapi.db
      .query(slug)
      .findMany({})
      .then((entries) => toArray(entries)?.[0]);

    if (!entry) {
      await strapi.entityService.create(slug, { data: datum });
    } else {
      await updateEntry(slug, entry.id, datum, { importStage });
    }
  } else {
    const defaultLocale = await strapi.plugin('i18n').service('locales').getDefaultLocale();
    const isDatumInDefaultLocale = !datum.locale || datum.locale === defaultLocale;

    datum = omit(datum, ['localizations']);
    if (isEmpty(omit(datum, ['id']))) {
      return;
    }

    let entryDefaultLocale = await strapi.db.query(slug).findOne({ where: { locale: defaultLocale } });
    if (!entryDefaultLocale) {
      entryDefaultLocale = await strapi.entityService.create(slug, { data: { ...datum, locale: defaultLocale } });
    }

    if (isDatumInDefaultLocale) {
      if (!entryDefaultLocale) {
        await strapi.entityService.create(slug, { data: datum });
      } else {
        await strapi.entityService.update(slug, entryDefaultLocale.id, { data: datum });
      }
    } else {
      const entryLocale = await strapi.db.query(slug).findOne({ where: { locale: datum.locale } });
      let datumLocale = { ...entryLocale, ...datum };

      await strapi.db.query(slug).delete({ where: { locale: datum.locale } });

      const insertLocalizedEntry = strapi.plugin('i18n').service('core-api').createCreateLocalizationHandler(getModel(slug));
      await insertLocalizedEntry({ id: entryDefaultLocale.id, data: datumLocale });
    }
  }
};

const updateEntry = async (slug: SchemaUID, id: EntryId, datum: Entry, { importStage }: { importStage: ImportStage }) => {
  if (importStage === 'simpleAttributes') {
    await strapi.entityService.update(slug, id, { data: omit(datum, ['id']) });
  } else if (importStage === 'relationAttributes') {
    await strapi.db.query(slug).update({ where: { id }, data: omit(datum, ['id']) });
  }
};

module.exports = {
  importDataV2,
};
