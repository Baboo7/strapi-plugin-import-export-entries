const cloneDeep = require('lodash/cloneDeep');
const isEmpty = require('lodash/isEmpty');
const omit = require('lodash/omit');
const pick = require('lodash/pick');
const { isArraySafe } = require('../../../libs/arrays');

const { ObjectBuilder } = require('../../../libs/objects');
const { CustomSlugs, CustomSlugToSlug } = require('../../config/constants');
const { getModel, getModelAttributes, getModelConfig } = require('../../utils/models');
const { findOrImportFile } = require('./utils/file');

/**
 * @typedef {Object} ImportDataRes
 * @property {Array<ImportDataFailures>} failures
 */
/**
 * Represents failed imports.
 * @typedef {Object} ImportDataFailures
 * @property {Error} error - Error raised.
 * @property {Object} data - Data for which import failed.
 */
/**
 * Import data.
 * @param {Object} fileContent - Content of the import file.
 * @param {Object} options
 * @param {string} options.slug - Slug of the imported model.
 * @param {Object} options.user - User importing the data.
 * @param {Object} options.idField - Field used as unique identifier.
 * @returns {Promise<ImportDataRes>}
 */
const importDataV2 = async (fileContent, { slug, user, idField }) => {
  const { data } = fileContent;

  const slugs = Object.keys(data);
  let failures = [];
  // Import without setting relations.
  for (const slugFromFile of slugs) {
    let slugFailures = [];
    if (slugFromFile === CustomSlugToSlug[CustomSlugs.MEDIA]) {
      slugFailures = await importMedia(Object.values(data[slugFromFile]), { user }).then((res) => res.slugFailures);
    } else {
      slugFailures = await importOtherSlug(Object.values(data[slugFromFile]), {
        slug: slugFromFile,
        user,
        // Keep behavior of `idField` of version 1.
        ...(slugFromFile === slug ? { idField } : {}),
        importStage: 'simpleAttributes',
      }).then((res) => res.failures);
    }
    failures = [...failures, ...(slugFailures || [])];
  }

  // Set relations relations.
  for (const slugFromFile of slugs) {
    let slugFailures = [];
    if (slugFromFile === CustomSlugToSlug[CustomSlugs.MEDIA]) {
      slugFailures = await importMedia(Object.values(data[slugFromFile]), { user }).then((res) => res.slugFailures);
    } else {
      slugFailures = await importOtherSlug(Object.values(data[slugFromFile]), {
        slug: slugFromFile,
        user,
        // Keep behavior of `idField` of version 1.
        ...(slugFromFile === slug ? { idField } : {}),
        importStage: 'relationAttributes',
      }).then((res) => res.failures);
    }
    failures = [...failures, ...(slugFailures || [])];
  }

  // Sync primary key sequence for postgres databases.
  // See https://github.com/strapi/strapi/issues/12493.
  if (strapi.db.config.connection.client === 'postgres') {
    for (const slugFromFile of slugs) {
      const model = getModel(slugFromFile);
      await strapi.db.connection.raw(`SELECT SETVAL((SELECT PG_GET_SERIAL_SEQUENCE('${model.collectionName}', 'id')), (SELECT MAX(id) FROM ${model.collectionName}) + 1, FALSE);`);
    }
  }

  return { failures };
};

const importMedia = async (fileData, { user }) => {
  const processed = [];
  for (let fileDatum of fileData) {
    let res;
    try {
      await findOrImportFile(fileDatum, user, { allowedFileTypes: ['any'] });
      res = { success: true };
    } catch (err) {
      strapi.log.error(err);
      res = { success: false, error: err.message, args: [fileDatum] };
    }
    processed.push(res);
  }

  const failures = processed.filter((p) => !p.success).map((f) => ({ error: f.error, data: f.args[0] }));

  return {
    failures,
  };
};

/**
 * Import data.
 * @param {Array<Object>} data
 * @param {Object} importOptions
 * @param {('simpleAttributes'|'relationAttributes')} [importOptions.importStage]
 */
const importOtherSlug = async (data, { slug, user, idField, importStage }) => {
  // Sort localized data with default locale first.
  await (async () => {
    const { isLocalized } = getModelConfig(slug);

    if (isLocalized) {
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
  })();

  const processed = [];
  for (let datum of data) {
    let res;
    try {
      await updateOrCreate(user, slug, datum, idField, { importStage });
      res = { success: true };
    } catch (err) {
      strapi.log.error(err);
      res = { success: false, error: err.message, args: [datum] };
    }
    processed.push(res);
  }

  const failures = processed.filter((p) => !p.success).map((f) => ({ error: f.error, data: f.args[0] }));

  return {
    failures,
  };
};

/**
 * Update or create entries for a given model.
 * @param {Object} user - User importing the data.
 * @param {string} slug - Slug of the model.
 * @param {Object} datum - Data to update/create entries from.
 * @param {string} idField - Field used as unique identifier.
 * @param {Object} importOptions
 * @param {('simpleAttributes'|'relationAttributes')} [importOptions.importStage]
 */
const updateOrCreate = async (user, slug, datum, idField = 'id', { importStage }) => {
  datum = cloneDeep(datum);

  if (importStage == 'simpleAttributes') {
    const attributeNames = getModelAttributes(slug, { filterOutType: ['component', 'dynamiczone', 'media', 'relation'], addIdAttribute: true })
      .map(({ name }) => name)
      .concat('localizations', 'locale');
    datum = pick(datum, attributeNames);
  } else if (importStage === 'relationAttributes') {
    const attributeNames = getModelAttributes(slug, { filterType: ['component', 'dynamiczone', 'media', 'relation'], addIdAttribute: true })
      .map(({ name }) => name)
      .concat('localizations', 'locale');
    datum = pick(datum, attributeNames);
  }

  const model = getModel(slug);
  if (model.kind === 'singleType') {
    await updateOrCreateSingleType(user, slug, datum, { importStage });
  } else {
    await updateOrCreateCollectionType(user, slug, datum, { idField, importStage });
  }
};

/**
 * Update or create entries for a given model.
 * @param {Object} user - User importing the data.
 * @param {string} slug - Slug of the model.
 * @param {Object} datum - Data to update/create entries from.
 * @param {Object} importOptions
 * @param {string} [importOptions.idField] - Field used as unique identifier.
 * @param {('simpleAttributes'|'relationAttributes')} [importOptions.importStage]
 */
const updateOrCreateCollectionType = async (user, slug, datum, { idField, importStage }) => {
  const { isLocalized } = getModelConfig(slug);

  const whereBuilder = new ObjectBuilder();
  if (datum[idField]) {
    whereBuilder.extend({ [idField]: datum[idField] });
  }
  const where = whereBuilder.get();

  if (!isLocalized) {
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

      datum = omit({ ...datum }, ['id']);

      if (!entry) {
        const createHandler = strapi.plugin('i18n').service('core-api').createCreateLocalizationHandler(getModel(slug));
        await createHandler({ id: entryDefaultLocale.id, data: datum });
      } else {
        await strapi.entityService.update(slug, entry.id, { data: datum });
      }
    }
  }
};

const updateOrCreateSingleType = async (user, slug, datum, { importStage }) => {
  const { isLocalized } = getModelConfig(slug);

  if (!isLocalized) {
    let entry = await strapi.db.query(slug).findMany();
    entry = isArraySafe(entry) ? entry[0] : entry;

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

      const createHandler = strapi.plugin('i18n').service('core-api').createCreateLocalizationHandler(getModel(slug));
      await createHandler({ id: entryDefaultLocale.id, data: datumLocale });
    }
  }
};

const updateEntry = async (slug, id, datum, { importStage }) => {
  datum = omit(datum, ['id']);

  if (importStage === 'simpleAttributes') {
    await strapi.entityService.update(slug, id, { data: datum });
  } else if (importStage === 'relationAttributes') {
    await strapi.db.query(slug).update({ where: { id }, data: datum });
  }
};

module.exports = {
  importDataV2,
};
