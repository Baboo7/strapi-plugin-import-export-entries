import cloneDeep from 'lodash/cloneDeep';
import isEmpty from 'lodash/isEmpty';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import { toArray } from '../../../libs/arrays';
import { ObjectBuilder } from '../../../libs/objects';
import { getModel, getModelAttributes } from '../../utils/models';
import { SchemaUID } from '@strapi/strapi/lib/types/utils';
import { Entry, EntryId, User } from '../../types';
import { toPairs } from 'lodash';
import { FileEntry, FileId } from './types';
import { findOrImportFile } from './utils/file';

type Import = {
  version: 2;
  data: ImportData;
};
type ImportData = ImportDataSlugEntries;
type ImportDataSlugEntries = {
  [slug in SchemaUID]: SlugEntries;
};
type SlugEntries = Record<FileId, FileEntry>;

type ImportFailures = {
  /** Error raised. */
  error: Error;
  /** Data for which import failed. */
  data: any;
};

class IdMapper {
  private mapping: {
    [slug in SchemaUID]?: Map<string | number, string | number>;
  } = {};

  public getMapping(slug: SchemaUID, fileId: string | number) {
    return this.mapping[slug]?.get(`${fileId}`);
  }

  public setMapping(slug: SchemaUID, fileId: string | number, dbId: string | number) {
    if (!this.mapping[slug]) {
      this.mapping[slug] = new Map<string | number, string | number>();
    }

    this.mapping[slug]!.set(`${fileId}`, dbId);
  }
}

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
  const fileIdToDbId = new IdMapper();

  // Import without setting relations.
  for (const slugFromFile of slugs) {
    if (slugFromFile === 'plugin::upload.file') {
      const res = await importMedia(data[slugFromFile], { user, fileIdToDbId });
      failures.push(...res.failures);
    } else {
      const res = await importOtherSlug(data[slugFromFile], {
        slug: slugFromFile,
        user,
        // Keep behavior of `idField` of version 1.
        ...(slugFromFile === slug ? { idField } : {}),
        importStage: 'simpleAttributes',
        fileIdToDbId,
      });
      failures.push(...res.failures);
    }
  }

  // Set relations relations.
  // TODO: prevent importing media twice
  // const SLUGS_TO_SKIP: SchemaUID[] = ['plugin::upload.file'];
  // for (const slugFromFile of slugs.filter(slug => !SLUGS_TO_SKIP.includes(slug))) {
  for (const slugFromFile of slugs) {
    if (slugFromFile === 'plugin::upload.file') {
      const res = await importMedia(data[slugFromFile], { user, fileIdToDbId });
      failures.push(...res.failures);
    } else {
      const res = await importOtherSlug(data[slugFromFile], {
        slug: slugFromFile,
        user,
        // Keep behavior of `idField` of version 1.
        ...(slugFromFile === slug ? { idField } : {}),
        importStage: 'relationAttributes',
        fileIdToDbId,
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

const importMedia = async (slugEntries: SlugEntries, { user, fileIdToDbId }: { user: User; fileIdToDbId: IdMapper }): Promise<{ failures: ImportFailures[] }> => {
  const failures: ImportFailures[] = [];

  const fileEntries = toPairs(slugEntries);

  for (let [fileId, fileEntry] of fileEntries) {
    try {
      const dbEntry = await findOrImportFile(fileEntry, user, { allowedFileTypes: ['any'] });
      if (dbEntry) {
        fileIdToDbId.setMapping('plugin::upload.file', fileId, dbEntry?.id);
      }
    } catch (err: any) {
      strapi.log.error(err);
      failures.push({ error: err.message, data: fileEntry });
    }
  }

  return {
    failures,
  };
};

type ImportStage = 'simpleAttributes' | 'relationAttributes';

const importOtherSlug = async (
  slugEntries: SlugEntries,
  { slug, user, idField, importStage, fileIdToDbId }: { slug: SchemaUID; user: User; idField?: string; importStage: ImportStage; fileIdToDbId: IdMapper },
): Promise<{ failures: ImportFailures[] }> => {
  let fileEntries = toPairs(slugEntries);

  // Sort localized data with default locale first.
  const sortDataByLocale = async () => {
    const schema = getModel(slug);

    if (schema.pluginOptions?.i18n?.localized) {
      const defaultLocale = await strapi.plugin('i18n').service('locales').getDefaultLocale();
      fileEntries = fileEntries.sort((dataA, dataB) => {
        if (dataA[1].locale === defaultLocale && dataB[1].locale === defaultLocale) {
          return 0;
        } else if (dataA[1].locale === defaultLocale) {
          return -1;
        }
        return 1;
      });
    }
  };
  await sortDataByLocale();

  const failures: ImportFailures[] = [];
  for (let [fileId, fileEntry] of fileEntries) {
    try {
      await updateOrCreate(user, slug, fileId, fileEntry, idField, { importStage, fileIdToDbId });
    } catch (err: any) {
      strapi.log.error(err);
      failures.push({ error: err.message, data: fileEntry });
    }
  }

  return {
    failures,
  };
};

const updateOrCreate = async (
  user: User,
  slug: SchemaUID,
  fileId: FileId,
  fileEntryArg: FileEntry,
  idField = 'id',
  { importStage, fileIdToDbId }: { importStage: ImportStage; fileIdToDbId: IdMapper },
) => {
  const schema = getModel(slug);
  let fileEntry = cloneDeep(fileEntryArg);

  if (importStage == 'simpleAttributes') {
    const attributeNames = getModelAttributes(slug, { filterOutType: ['component', 'dynamiczone', 'media', 'relation'] })
      .map(({ name }) => name)
      .concat('id', 'localizations', 'locale');
    fileEntry = pick(fileEntry, attributeNames);
  } else if (importStage === 'relationAttributes') {
    const attributeNames = getModelAttributes(slug, { filterType: ['component', 'dynamiczone', 'media', 'relation'] })
      .map(({ name }) => name)
      .concat('id', 'localizations', 'locale');
    fileEntry = pick(fileEntry, attributeNames);

    // TODO: update ids using mapping file id => db id, once components PR merged
  }

  if (schema.modelType === 'contentType' && schema.kind === 'singleType') {
    await updateOrCreateSingleTypeEntry(user, slug, fileId, fileEntry, { importStage, fileIdToDbId });
  } else {
    await updateOrCreateEntry(user, slug, fileId, fileEntry, { idField, importStage, fileIdToDbId });
  }
};

const updateOrCreateEntry = async (
  user: User,
  slug: SchemaUID,
  fileId: FileId,
  fileEntry: FileEntry,
  { idField, importStage, fileIdToDbId }: { idField: string; importStage: ImportStage; fileIdToDbId: IdMapper },
) => {
  const schema = getModel(slug);

  const whereBuilder = new ObjectBuilder();
  if (fileIdToDbId.getMapping(slug, fileId)) {
    whereBuilder.extend({ id: fileIdToDbId.getMapping(slug, fileId) });
  } else if (fileEntry[idField]) {
    whereBuilder.extend({ [idField]: fileEntry[idField] });
  }
  const where = whereBuilder.get();

  if (!schema.pluginOptions?.i18n?.localized) {
    let dbEntry: Entry = await strapi.db.query(slug).findOne({ where });

    if (!dbEntry) {
      dbEntry = await strapi.entityService.create(slug, { data: fileEntry });
    } else {
      dbEntry = await updateEntry(slug, dbEntry.id, fileEntry, { importStage });
    }
    fileIdToDbId.setMapping(slug, fileId, dbEntry.id);
  } else {
    if (!fileEntry.locale) {
      throw new Error(`No locale set to import entry for slug ${slug} (data ${JSON.stringify(fileEntry)})`);
    }

    const defaultLocale = await strapi.plugin('i18n').service('locales').getDefaultLocale();
    const isDatumInDefaultLocale = fileEntry.locale === defaultLocale;

    let dbEntryDefaultLocaleId: EntryId | null = null;
    let dbEntry: Entry | null = await strapi.db.query(slug).findOne({ where, populate: ['localizations'] });
    if (isDatumInDefaultLocale) {
      dbEntryDefaultLocaleId = dbEntry?.id || null;
    } else {
      if (dbEntry) {
        // If `dbEntry` has been found, `dbEntry` holds the data for the default locale and
        // the data for other locales in its `localizations` attribute.
        const localizedEntries = [dbEntry, ...(dbEntry?.localizations || [])];
        dbEntryDefaultLocaleId = localizedEntries.find((e: Entry) => e.locale === defaultLocale)?.id || null;
        dbEntry = localizedEntries.find((e: Entry) => e.locale === fileEntry.locale) || null;
      } else {
        // Otherwise try to find dbEntry for default locale through localized siblings.
        let idx = 0;
        const fileLocalizationsIds = (fileEntry?.localizations as EntryId[]) || [];
        while (idx < fileLocalizationsIds.length && !dbEntryDefaultLocaleId && !dbEntry) {
          const dbId = fileIdToDbId.getMapping(slug, fileLocalizationsIds[idx]);
          const localizedEntry: Entry = await strapi.db.query(slug).findOne({ where: { id: dbId }, populate: ['localizations'] });
          const localizedEntries = localizedEntry != null ? [localizedEntry, ...(localizedEntry?.localizations || [])] : [];
          if (!dbEntryDefaultLocaleId) {
            dbEntryDefaultLocaleId = localizedEntries.find((e: Entry) => e.locale === defaultLocale)?.id || null;
          }
          if (!dbEntry) {
            dbEntry = localizedEntries.find((e: Entry) => e.locale === fileEntry.locale) || null;
          }
          idx += 1;
        }
      }
    }

    fileEntry = omit(fileEntry, ['localizations']);
    if (isEmpty(omit(fileEntry, ['id']))) {
      return;
    }

    if (isDatumInDefaultLocale) {
      if (!dbEntryDefaultLocaleId) {
        const createdEntry = await strapi.entityService.create(slug, { data: fileEntry });
        fileIdToDbId.setMapping(slug, fileId, createdEntry.id);
      } else {
        const updatedEntry = await strapi.entityService.update(slug, dbEntryDefaultLocaleId, { data: omit({ ...fileEntry }, ['id']) });
        fileIdToDbId.setMapping(slug, fileId, updatedEntry.id);
      }
    } else {
      if (!dbEntryDefaultLocaleId) {
        throw new Error(`Could not find default locale entry to import localization for slug ${slug} (data ${JSON.stringify(fileEntry)})`);
      }

      if (!dbEntry) {
        const insertLocalizedEntry = strapi.plugin('i18n').service('core-api').createCreateLocalizationHandler(getModel(slug));
        const createdEntry: Entry = await insertLocalizedEntry({ id: dbEntryDefaultLocaleId, data: omit({ ...fileEntry }, ['id']) });
        fileIdToDbId.setMapping(slug, fileId, createdEntry.id);
      } else {
        const updatedEntry = await strapi.entityService.update(slug, dbEntry.id, { data: omit({ ...fileEntry }, ['id']) });
        fileIdToDbId.setMapping(slug, fileId, updatedEntry.id);
      }
    }
  }
};

const updateOrCreateSingleTypeEntry = async (
  user: User,
  slug: SchemaUID,
  fileId: FileId,
  fileEntry: FileEntry,
  { importStage, fileIdToDbId }: { importStage: ImportStage; fileIdToDbId: IdMapper },
) => {
  const schema = getModel(slug);

  if (!schema.pluginOptions?.i18n?.localized) {
    let dbEntry: Entry = await strapi.db
      .query(slug)
      .findMany({})
      .then((entries) => toArray(entries)?.[0]);

    if (!dbEntry) {
      const createdEntry = await strapi.entityService.create(slug, { data: fileEntry });
      fileIdToDbId.setMapping(slug, fileId, createdEntry.id);
    } else {
      const updatedEntry = await updateEntry(slug, dbEntry.id, fileEntry, { importStage });
      fileIdToDbId.setMapping(slug, fileId, updatedEntry.id);
    }
  } else {
    const defaultLocale = await strapi.plugin('i18n').service('locales').getDefaultLocale();
    const isDatumInDefaultLocale = !fileEntry.locale || fileEntry.locale === defaultLocale;

    fileEntry = omit(fileEntry, ['localizations']);
    if (isEmpty(omit(fileEntry, ['id']))) {
      return;
    }

    let entryDefaultLocale = await strapi.db.query(slug).findOne({ where: { locale: defaultLocale } });
    if (!entryDefaultLocale) {
      entryDefaultLocale = await strapi.entityService.create(slug, { data: { ...fileEntry, locale: defaultLocale } });
    }

    if (isDatumInDefaultLocale) {
      if (!entryDefaultLocale) {
        const createdEntry: Entry = await strapi.entityService.create(slug, { data: fileEntry });
        fileIdToDbId.setMapping(slug, fileId, createdEntry.id);
      } else {
        const updatedEntry: Entry = await strapi.entityService.update(slug, entryDefaultLocale.id, { data: fileEntry });
        fileIdToDbId.setMapping(slug, fileId, updatedEntry.id);
      }
    } else {
      const entryLocale = await strapi.db.query(slug).findOne({ where: { locale: fileEntry.locale } });
      let datumLocale = { ...entryLocale, ...fileEntry };

      await strapi.db.query(slug).delete({ where: { locale: fileEntry.locale } });

      const insertLocalizedEntry = strapi.plugin('i18n').service('core-api').createCreateLocalizationHandler(getModel(slug));
      const createdEntry: Entry = await insertLocalizedEntry({ id: entryDefaultLocale.id, data: datumLocale });
      fileIdToDbId.setMapping(slug, fileId, createdEntry.id);
    }
  }
};

const updateEntry = async (slug: SchemaUID, dbId: EntryId, fileEntry: FileEntry, { importStage }: { importStage: ImportStage }): Promise<Entry> => {
  if (importStage === 'simpleAttributes') {
    // Use entity service to validate values of attributes
    return strapi.entityService.update(slug, dbId, { data: omit(fileEntry, ['id']) });
  } else if (importStage === 'relationAttributes') {
    return strapi.db.query(slug).update({ where: { id: dbId }, data: omit(fileEntry, ['id']) });
  }

  throw new Error(`Unhandled importStage ${importStage}`);
};

module.exports = {
  importDataV2,
};
