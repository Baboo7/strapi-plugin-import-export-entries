module.exports = {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/import/model-attributes/:slug",
      handler: "import.getModelAttributes",
      config: {
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/import",
      handler: "import.importData",
      config: {
        policies: [],
      },
    },
  ],
};
