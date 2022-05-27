module.exports = {
  type: "admin",
  routes: [
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
