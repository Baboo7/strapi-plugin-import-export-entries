const { isArraySafe, toArray } = require('../../../libs/arrays');
const { ObjectBuilder, isObjectSafe } = require('../../../libs/objects');
const { catchError } = require('../../utils');
const { getModelAttributes } = require('../../utils/models');
const { findOrImportFile } = require('./utils/file');
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
  const relationAttributes = getModelAttributes(slug, ['component', 'dynamiczone', 'media', 'relation']);
  for (let attribute of relationAttributes) {
    data[attribute.name] = await updateOrCreateRelation(user, attribute, data[attribute.name]);
  }

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
  if (relData == null) {
    return null;
  }

  if (['createdBy', 'updatedBy'].includes(rel.name)) {
    return user.id;
  } else if (rel.type === 'dynamiczone') {
    const processingComponents = (relData || []).map((componentDatum) => updateOrCreate(user, componentDatum.__component, componentDatum));
    let components = await Promise.all(processingComponents);
    components = components.map((component, i) => ({ ...component, __component: relData[i].__component }));
    return components;
  } else if (rel.type === 'component') {
    relData = toArray(relData);
    relData = rel.repeatable ? relData : relData.slice(0, 1);
    const entries = await Promise.all(relData.map((relDatum) => updateOrCreate(user, rel.component, relDatum)));
    return rel.repeatable ? entries.map((entry) => entry.id) : entries?.[0]?.id || null;
  } else if (rel.type === 'media') {
    relData = toArray(relData);
    relData = rel.multiple ? relData : relData.slice(0, 1);
    const entryIds = [];
    for (const relDatum of relData) {
      const media = await findOrImportFile(relDatum, user, { allowedFileTypes: rel.allowedTypes });
      if (media?.id) {
        entryIds.push(media.id);
      }
    }
    return rel.multiple ? entryIds : entryIds?.[0] || null;
  } else if (rel.type === 'relation') {
    const isMultiple = isArraySafe(relData);
    relData = toArray(relData);
    const entryIds = [];
    for (const relDatum of relData) {
      const entry = await updateOrCreate(user, rel.target, relDatum);
      if (entry?.id) {
        entryIds.push(entry.id);
      }
    }
    return isMultiple ? entryIds : entryIds?.[0] || null;
  }

  throw new Error(`Could not update or create relation of type ${rel.type}.`);
};

module.exports = {
  importData,
};
