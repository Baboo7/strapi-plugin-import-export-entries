const { isEmpty, merge } = require('lodash/fp');
const qs = require('qs');

const { ObjectBuilder } = require('../../../libs/objects');
const { CustomSlugToSlug } = require('../../config/constants');
const { convertToCsv, convertToJson } = require('./converters');

const dataFormats = {
  CSV: 'csv',
  JSON: 'json',
  JSON_V2: 'json-v2',
};

const dataConverterConfigs = {
  [dataFormats.CSV]: {
    convertEntries: convertToCsv,
  },
  [dataFormats.JSON]: {
    convertEntries: convertToJson,
  },
};

/**
 * Export data.
 * @param {Object} options
 * @param {string} options.slug
 * @param {("csv"|"json")} options.exportFormat
 * @param {string} options.search
 * @param {boolean} options.applySearch
 * @param {boolean} options.relationsAsId
 * @param {number} options.deepness
 * @returns {string}
 */
const exportData = async ({ slug, search, applySearch, exportFormat, relationsAsId, deepness = 5 }) => {
  const slugToProcess = CustomSlugToSlug[slug] || slug;

  const queryBuilder = new ObjectBuilder();
  queryBuilder.extend(getPopulateFromSchema(slugToProcess, deepness));
  if (applySearch) {
    queryBuilder.extend(buildFilterQuery(search));
  }
  const query = queryBuilder.get();

  const entries = await strapi.entityService.findMany(slugToProcess, query);

  const data = convertData(entries, {
    slug: slugToProcess,
    dataFormat: exportFormat,
    relationsAsId,
  });

  return data;
};

const buildFilterQuery = (search) => {
  let { filters, sort: sortRaw } = qs.parse(search);

  const [attr, value] = sortRaw?.split(':') || [];
  let sort = {};
  if (attr && value) {
    sort[attr] = value.toLowerCase();
  }

  return {
    filters,
    sort,
  };
};

/**
 *
 * @param {Array<Object>} entries
 * @param {Object} options
 * @param {string} options.slug
 * @param {string} options.dataFormat
 * @param {boolean} options.relationsAsId
 * @returns
 */
const convertData = (entries, options) => {
  const converter = getConverter(options.dataFormat);

  const convertedData = converter.convertEntries(entries, options);

  return convertedData;
};

const getConverter = (dataFormat) => {
  const converter = dataConverterConfigs[dataFormat];

  if (!converter) {
    throw new Error(`Data format ${dataFormat} is not supported.`);
  }

  return converter;
};

const getPopulateFromSchema = (slug, deepness = 5) => {
  if (deepness <= 1) {
    return true;
  }

  if (slug === 'admin::user') {
    return undefined;
  }

  const populate = {};
  const model = strapi.getModel(slug);
  for (const [attributeName, attribute] of Object.entries(getModelPopulationAttributes(model))) {
    if (!attribute) {
      continue;
    }

    if (attribute.type === 'component') {
      populate[attributeName] = getPopulateFromSchema(attribute.component, deepness - 1);
    } else if (attribute.type === 'dynamiczone') {
      const dynamicPopulate = attribute.components.reduce((zonePopulate, component) => {
        const compPopulate = getPopulateFromSchema(component, deepness - 1);
        return compPopulate === true ? zonePopulate : merge(zonePopulate, compPopulate);
      }, {});
      populate[attributeName] = isEmpty(dynamicPopulate) ? true : dynamicPopulate;
    } else if (attribute.type === 'relation') {
      const relationPopulate = getPopulateFromSchema(attribute.target, deepness - 1);
      if (relationPopulate) {
        populate[attributeName] = relationPopulate;
      }
    } else if (attribute.type === 'media') {
      populate[attributeName] = true;
    }
  }

  return isEmpty(populate) ? true : { populate };
};

const getModelPopulationAttributes = (model) => {
  if (model.uid === 'plugin::upload.file') {
    const { related, ...attributes } = model.attributes;
    return attributes;
  }

  return model.attributes;
};

module.exports = {
  formats: dataFormats,
  exportData,
  getPopulateFromSchema,
};
