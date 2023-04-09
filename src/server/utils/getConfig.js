const pluginId = require('./pluginId');

/**
 * @typedef {("serverPublicHostname")} ConfigParam
 */

/**
 * Get a config parameter.
 * @param {ConfigParam} param
 */
const getConfig = (param) => {
  return strapi.config.get(`plugin.${pluginId}.${param}`);
};

module.exports = {
  getConfig,
};
