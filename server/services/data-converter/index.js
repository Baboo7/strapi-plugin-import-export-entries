const { convertToCsv, convertToJson } = require("./utils");

const dataFormats = {
  CSV: "csv",
  JSON: "json",
};

const dataConverterConfigs = {
  [dataFormats.CSV]: {
    convertEntries: convertToCsv,
  },
  [dataFormats.JSON]: {
    convertEntries: convertToJson,
  },
};

const convertEntries = (entries, { slug, dataFormat }) => {
  const converter = getConverter(dataFormat);

  const convertedData = converter.convertEntries(entries, { slug });

  return convertedData;
};

const getConverter = (dataFormat) => {
  const converter = dataConverterConfigs[dataFormat];

  if (!converter) {
    throw new Error(`Data format ${dataFormat} is not supported.`);
  }

  return converter;
};

module.exports = ({ strapi }) => ({
  formats: dataFormats,
  convertEntries,
});
