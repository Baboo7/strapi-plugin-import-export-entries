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
        excludeRelations: true,
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
        onlyRelations: true,
      }).then((res) => res.failures);
    }
    failures = [...failures, ...(slugFailures || [])];
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
 * @param {boolean} [importOptions.excludeRelations]
 * @param {boolean} [importOptions.onlyRelations]
 * @returns
 */
const importOtherSlug = async (data, { slug, user, idField, excludeRelations, onlyRelations }) => {
  const processed = [];
  for (let datum of data) {
    let res;
    try {
      await updateOrCreate(user, slug, datum, idField, { excludeRelations, onlyRelations });
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
 * @returns Updated/created entry.
 */
const updateOrCreate = async (user, slug, datum, idField = 'id', { excludeRelations, onlyRelations }) => {
  datum = cloneDeep(datum);

  if (excludeRelations) {
    const attributeNames = getModelAttributes(slug, { filterOutType: ['component', 'dynamiczone', 'media', 'relation'], addIdAttribute: true }).map(({ name }) => name);
    datum = pick(datum, attributeNames);
  } else if (onlyRelations) {
    const attributeNames = getModelAttributes(slug, { filterType: ['component', 'dynamiczone', 'media', 'relation'], addIdAttribute: true }).map(({ name }) => name);
    datum = pick(datum, attributeNames);

    // For compatibility with older file structure.
    const componentAttributeNames = getModelAttributes(slug, { filterType: ['component'] }).map(({ name }) => name);
    for (const componentName of componentAttributeNames) {
      // If the component is an integer, then it's an id.
      if (Number.isInteger(datum[componentName])) {
        datum[componentName] = { id: datum[componentName] };
      }
    }
  }

  const model = getModel(slug);
  if (model.kind === 'singleType') {
    await updateOrCreateSingleType(user, slug, datum, idField);
  } else {
    await updateOrCreateCollectionType(user, slug, datum, idField);
  }
};

const updateOrCreateCollectionType = async (user, slug, datum, idField) => {
  const whereBuilder = new ObjectBuilder();
  if (datum[idField]) {
    whereBuilder.extend({ [idField]: datum[idField] });
  }
  const where = whereBuilder.get();

  const shouldFindEntryId = idField !== 'id' && datum[idField];
  if (shouldFindEntryId) {
    delete datum.id;
    let entry = await strapi.db.query(slug).findOne({ where });
    datum.id = entry?.id;
  }

  let entry;
  if (!datum.id) {
    entry = await strapi.entityService.create(slug, { data: datum });
  } else {
    entry = await strapi.entityService.update(slug, datum.id, { data: datum });

    if (!entry) {
      entry = await strapi.entityService.create(slug, { data: datum });
    }
  }
};

const updateOrCreateSingleType = async (user, slug, datum, idField) => {
  const { isLocalized } = getModelConfig(slug);

  if (!isLocalized) {
    let entry = await strapi.db.query(slug).findMany();
    entry = isArraySafe(entry) ? entry[0] : entry;

    if (!entry) {
      await strapi.entityService.create(slug, { data: datum });
    } else {
      await strapi.entityService.update(slug, entry.id, { data: datum });
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

module.exports = {
  importDataV2,
};
