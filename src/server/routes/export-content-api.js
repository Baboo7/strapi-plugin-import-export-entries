module.exports = {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/content/export/contentTypes',
      handler: 'export.exportData',
      config: {
        policies: [],
      },
    },
  ],
};
