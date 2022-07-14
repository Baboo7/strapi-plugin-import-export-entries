const { convertToCsv, convertToJson } = require('./converters');

const dataFormats = {
  CSV: 'csv',
  JSON: 'json',
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
 *
 * @param {Array<Object>} entries
 * @param {Object} options
 * @param {string} options.slug
 * @param {string} options.dataFormat
 * @param {boolean} options.relationsAsId
 * @returns
 */
const exportData = (entries, options) => {
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

const getPopulateFromSchema = (slug) => {
  const schema = strapi.getModel(slug);
  let populate = Object.keys(schema.attributes).reduce((populate, attributeName) => {
    const attribute = schema.attributes[attributeName];

    if (['media', 'relation'].includes(attribute.type)) {
      return { ...populate, [attributeName]: { populate: '*' } };
    }

    if (['component', 'dynamiczone'].includes(attribute.type)) {
      return {
        ...populate,
        [attributeName]: populateComponentsAttributes(attribute),
      };
    }

    if (['createdBy', 'updatedBy'].includes(attributeName)) {
      return { ...populate, [attributeName]: { populate: '*' } };
    }

    return populate;
  }, {});

  return populate;
};

const populateComponentsAttributes = ({ components }) => {
  if (components) {
    const populate = components.reduce((populate, componentPath) => {
      return { ...populate, [componentPath.split('.').pop()]: { populate: '*' } };
    }, {});
    return { populate };
  }
  return { populate: '*' };
};

module.exports = ({ strapi }) => ({
  formats: dataFormats,
  exportData,
  getPopulateFromSchema,
});
