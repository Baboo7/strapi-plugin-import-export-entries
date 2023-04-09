'use strict';

const importData = require('./import-data');

module.exports = ({ strapi }) => ({
  importData: importData({ strapi }),
});
