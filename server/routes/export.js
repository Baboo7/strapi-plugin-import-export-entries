module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/export/contentTypes',
      handler: 'export.exportData',
      config: {
        policies: [],
      },
    },
  ],
};
