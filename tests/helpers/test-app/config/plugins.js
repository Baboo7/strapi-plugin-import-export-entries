const { join } = require('path');

module.exports = ({ env }) => ({
  'import-export-entries': {
    enabled: true,
    resolve: resolveFromRoot(),
    config: {
      serverPublicHostname: 'http://localhost:1337',
    },
  },
  seo: {
    enabled: true,
    resolve: resolveFromRoot('node_modules/@strapi/plugin-seo'),
  },
});

const resolveFromRoot = (path = '') => {
  return join(__dirname, '../../../../', path);
};
