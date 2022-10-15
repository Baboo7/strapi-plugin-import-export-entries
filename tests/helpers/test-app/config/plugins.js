const { join } = require('path');

module.exports = ({ env }) => ({
  'import-export-entries': {
    enabled: true,
    resolve: resolveFromRoot(),
    config: {
      serverPublicHostname: 'http://localhost:1337',
    },
  },
  'users-permissions': {
    config: {
      jwtSecret: 'ARh4pyCd6aA3U7I2/X+ZUg==',
      jwt: {
        expiresIn: '7d',
      },
    },
  },
});

const resolveFromRoot = (path = '') => {
  return join(__dirname, '../../../../', path);
};
