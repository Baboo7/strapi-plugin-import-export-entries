const { ObjectBuilder } = require('../../../libs/objects');
const { catchError } = require('../../utils');
const { getModelAttributes } = require('../../utils/models');
const { parseInputData } = require('./utils/parsers');

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
 * @param {Array<Object>} dataRaw - Data to import.
 * @param {Object} options
 * @param {string} options.slug - Slug of the model to import.
 * @param {("csv" | "json")} options.format - Format of the imported data.
 * @param {Object} options.user - User importing the data.
 * @param {Object} options.idField - Field used as unique identifier.
 * @returns {Promise<ImportDataRes>}
 */
const importData = async (dataRaw, { slug, format, user, idField }) => {
  const data = await parseInputData(format, dataRaw, { slug });

  const processed = [];
  for (let datum of data) {
    const res = await catchError((datum) => updateOrCreate(user, slug, datum, idField), datum);
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
  const relations = getModelAttributes(slug, 'relation');
  const processingRelations = relations.map(async (rel) => {
    data[rel.name] = await updateOrCreateRelation(user, rel, data[rel.name]);
  });
  await Promise.all(processingRelations);

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

/**
 * Update or create a relation.
 * @param {Object} user
 * @param {Attribute} rel
 * @param {number | Object | Array<Object>} relData
 */
const updateOrCreateRelation = async (user, rel, relData) => {
  const relName = rel.name;
  if (['createdBy', 'updatedBy'].includes(relName)) {
    return user.id;
  }
  // relData has to be checked since typeof null === "object".
  else if (relData && Array.isArray(relData)) {
    const entries = await Promise.all(relData.map((relDatum) => updateOrCreate(user, rel.target, relDatum)));
    return entries.map((entry) => entry.id);
  }
  // relData has to be checked since typeof null === "object".
  else if (relData && typeof relData === 'object') {
    const entry = await updateOrCreate(user, rel.target, relData);
    return entry?.id || null;
  }
};

module.exports = {
  importData,
};
