module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/export/contentTypes',
      handler: 'exportAdmin.exportData',
      config: {
        policies: [],
      },
    },
  ],
};
