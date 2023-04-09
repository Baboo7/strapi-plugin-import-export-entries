module.exports = {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/content/import',
      handler: 'import.importData',
      config: {
        policies: [],
      },
    },
  ],
};
