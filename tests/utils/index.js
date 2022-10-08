const pluginId = require('./pluginId');

const SLUGS = {
  COLLECTION_TYPE: 'api::collection-type.collection-type',
  SINGLE_TYPE: 'api::single-type.single-type',
};

/**
 * ServiceName.
 * @typedef {("export"|"import")} ServiceName
 */

/**
 * Get a plugin service.
 * @param {ServiceName} serviceName
 * @returns
 */
const getService = (serviceName) => {
  return strapi.plugin(pluginId).service(serviceName);
};

module.exports = {
  SLUGS,
  getService,
};
