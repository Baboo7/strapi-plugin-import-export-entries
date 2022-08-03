'use strict';

const exportAdminController = require('./admin/export-controller');
const importAdminController = require('./admin/import-controller');
const exportContentApiController = require('./content-api/export-controller');
const importContentApiController = require('./content-api/import-controller');

module.exports = {
  exportAdmin: exportAdminController,
  importAdmin: importAdminController,
  export: exportContentApiController,
  import: importContentApiController,
};
