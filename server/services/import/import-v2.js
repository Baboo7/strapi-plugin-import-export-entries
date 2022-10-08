const { ObjectBuilder } = require('../../../libs/objects');
const { CustomSlugs, CustomSlugToSlug } = require('../../config/constants');
const { getModel } = require('../../utils/models');
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
      }).then((res) => res.failures);
    }
    failures = [...failures, ...(slugFailures || [])];
  }

  return {
    failures,
  };
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

const importOtherSlug = async (data, { slug, user, idField }) => {
  const processed = [];
  for (let datum of data) {
    let res;
    try {
      await updateOrCreate(user, slug, datum, idField);
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
 * @param {Object} data - Data to update/create entries from.
 * @param {string} idField - Field used as unique identifier.
 * @returns Updated/created entry.
 */
const updateOrCreate = async (user, slug, data, idField = 'id') => {
  let entry;
  const model = getModel(slug);
  if (model.kind === 'singleType') {
    entry = await updateOrCreateSingleType(user, slug, data, idField);
  } else {
    entry = await updateOrCreateCollectionType(user, slug, data, idField);
  }
  return entry;
};

const updateOrCreateCollectionType = async (user, slug, data, idField) => {
  const whereBuilder = new ObjectBuilder();
  if (data[idField]) {
    whereBuilder.extend({ [idField]: data[idField] });
  }
  const where = whereBuilder.get();

  // Prevent strapi from throwing a unique constraint error on id field.
  if (idField !== 'id') {
    delete data.id;
  }

  let entry;
  if (!where[idField]) {
    entry = await strapi.db.query(slug).create({ data });
  } else {
    entry = await strapi.db.query(slug).update({ where, data });

    if (!entry) {
      entry = await strapi.db.query(slug).create({ data });
    }
  }

  return entry;
};

const updateOrCreateSingleType = async (user, slug, data, idField) => {
  let [entry] = await strapi.db.query(slug).findMany();
  if (!entry) {
    entry = await strapi.db.query(slug).create({ data });
  } else {
    entry = await strapi.db.query(slug).update({ where: { id: entry.id }, data });
  }

  return entry;
};

module.exports = {
  importDataV2,
};
