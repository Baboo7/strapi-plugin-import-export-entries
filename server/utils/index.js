const pluginId = require("./pluginId");

/**
 * ServiceName.
 * @typedef {("data-converter")} ServiceName
 */

/**
 * Get a plugin service.
 * @param {ServiceName} serviceName
 * @returns
 */
const getService = (serviceName) => {
  return strapi.plugin(pluginId).service(serviceName);
};

const catchError = async (fn, ...args) => {
  try {
    await fn(...args);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message, args };
  }
};

module.exports = {
  getService,
  catchError,
};
