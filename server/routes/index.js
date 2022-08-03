const exportAdminRoutes = require('./export-admin');
const importAdminRoutes = require('./import-admin');
const exportContentApiRoutes = require('./export-content-api');
const importContentApiRoutes = require('./import-content-api');

module.exports = {
  exportAdminRoutes,
  importAdminRoutes,
  export: exportContentApiRoutes,
  import: importContentApiRoutes,
};
