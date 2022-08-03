'use strict';

const getModelAttributes = require('./get-model-attributes');
const importData = require('./import-data');

module.exports = ({ strapi }) => ({
  getModelAttributes: getModelAttributes({ strapi }),
  importData: importData({ strapi }),
});
