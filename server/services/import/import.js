const { ObjectBuilder } = require("../../../libs/objects");
const { catchError } = require("../../utils");
const { getModelAttributes } = require("../../utils/models");
const { parseInputData } = require("./utils/parsers");

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
 * @returns {Promise<ImportDataRes>}
 */
const importData = async (dataRaw, { slug, format, user }) => {
  const data = await parseInputData(format, dataRaw, { slug });

  const processed = [];
  for (let datum of data) {
    const res = await catchError(
      (datum) => updateOrCreate(user, slug, datum),
      datum
    );
    processed.push(res);
  }

  const failures = processed
    .filter((p) => !p.success)
    .map((f) => ({ error: f.error, data: f.args[0] }));

  return {
    failures,
  };
};

/**
 * Update or create entries for a given model.
 * @param {*} user - User importing the data.
 * @param {*} slug - Slug of the model.
 * @param {*} data - Data to update/create entries from.
 * @returns Updated/created entry.
 */
const updateOrCreate = async (user, slug, data) => {
  const relations = getModelAttributes(slug, "relation");
  const processingRelations = relations.map((rel) =>
    updateOrCreateRelation(user, rel, data)
  );
  await Promise.all(processingRelations);

  const whereBuilder = new ObjectBuilder();
  if (data.id) {
    whereBuilder.extend({ id: data.id });
  }
  const where = whereBuilder.get();

  let entry;
  if (!where.id) {
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
 * @param {number | Object | Array<Object>} data
 */
const updateOrCreateRelation = async (user, rel, data) => {
  const relName = rel.name;
  if (["createdBy", "updatedBy"].includes(relName)) {
    data[relName] = user.id;
  }
  // data[relName] has to be checked since typeof null === "object".
  else if (data[relName] && Array.isArray(data[relName])) {
    const entries = await Promise.all(
      data[relName].map((relData) => updateOrCreate(user, rel.target, relData))
    );
    data[relName] = entries.map((entry) => entry.id);
  }
  // data[relName] has to be checked since typeof null === "object".
  else if (data[relName] && typeof data[relName] === "object") {
    const entry = await updateOrCreate(user, rel.target, data[relName]);
    data[relName] = entry?.id || null;
  }
};

module.exports = {
  importData,
};
