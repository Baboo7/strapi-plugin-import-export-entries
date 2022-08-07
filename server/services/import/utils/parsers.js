'use strict';

const csvtojson = require('csvtojson');

const { getModelAttributes } = require('../../../utils/models');

const parseCsv = async (dataRaw, { slug }) => {
  let data = await csvtojson().fromString(dataRaw);

  const relationNames = getModelAttributes(slug, { filterType: ['component', 'dynamiczone', 'media', 'relation'] }).map((a) => a.name);
  data = data.map((datum) => {
    for (let name of relationNames) {
      try {
        datum[name] = JSON.parse(datum[name]);
      } catch (err) {
        strapi.log.error(err);
      }
    }
    return datum;
  });

  return data;
};

const parseJson = async (dataRaw, { slug }) => {
  let data = JSON.parse(dataRaw);
  return data;
};

const parsers = {
  csv: parseCsv,
  json: parseJson,
};

/**
 * Parse input data.
 * @param {string} format
 * @param {*} dataRaw
 * @param {Object} options
 * @param {string} options.slug
 */
const parseInputData = async (format, dataRaw, { slug }) => {
  const parser = parsers[format];
  if (!parser) {
    throw new Error(`Data input format ${format} is not supported.`);
  }

  const data = await parser(dataRaw, { slug });
  return data;
};

module.exports = {
  parseInputData,
};
