const pluginId = require("./pluginId");

const Services = {
  DATA_CONVERTER: "data-converter",
};

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
  Services,
  getService,
  catchError,
};
