const pluginId = require("./pluginId");

const Services = {
  DATA_CONVERTER: "data-converter",
};

const getService = (serviceName) => {
  return strapi.plugin(pluginId).service(serviceName);
};

module.exports = {
  Services,
  getService,
};
