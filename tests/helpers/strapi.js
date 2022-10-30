const Strapi = require('@strapi/strapi');
const fs = require('fs');

const DELETE_DB_ENABLED = false;
const CLEANUP_DB_ENABLED = true;

const LOCALES = [
  { code: 'fr', name: 'French (fr)' },
  { code: 'it', name: 'Italian (it)' },
];

let instance;

async function setupStrapi() {
  if (!instance) {
    await Strapi({
      appDir: `${__dirname}/test-app`,
      serveAdminPanel: false,
      autoReload: false,
    }).load();
    instance = strapi;

    await instance.server.mount();
  }
  return instance;
}

async function cleanupStrapi() {
  //close server to release the db-file
  await strapi.server.httpServer.close();

  //delete test database after all tests have completed
  const dbSettings = strapi.config.get('database.connection.connection');
  if (DELETE_DB_ENABLED && dbSettings && dbSettings.filename) {
    const tmpDbFile = dbSettings.filename;
    if (fs.existsSync(tmpDbFile)) {
      fs.unlinkSync(tmpDbFile);
    }
  }
  // close the connection to the database
  await strapi.db.connection.destroy();
}

async function setupDatabase() {
  for (const locale of LOCALES) {
    const entry = await strapi.plugin('i18n').service('locales').findByCode(locale.code);
    if (!entry) {
      console.log(`Created locale: ${locale.name}`);
      await strapi.query('plugin::i18n.locale').create({ data: { ...locale } });
    }
  }
}

/**
 * Cleans database.
 * @param {Object} options
 * @param {boolean} options.broadCleaning
 */
async function cleanupDatabase(options = {}) {
  if (CLEANUP_DB_ENABLED) {
    const cleaningCollections = Array.from(strapi.db.metadata)
      .map(([collectionName]) => collectionName)
      .filter(shouldCleanCollection(options))
      .map((collectionName) =>
        strapi.db.query(collectionName).deleteMany({
          where: {
            id: { $gte: 0 },
          },
        }),
      );

    await Promise.all(cleaningCollections);
  }
}

const shouldCleanCollection = ({ broadCleaning = false } = {}) => {
  return (collectionName) => {
    if (broadCleaning) {
      return collectionName.startsWith('admin::') || collectionName.startsWith('api::') || collectionName.startsWith('plugin::') || isComponent(collectionName);
    }

    return collectionName.startsWith('api::') || isComponent(collectionName);
  };
};

const isComponent = (collectionName) => Object.keys(strapi.components).indexOf(collectionName) > -1;

module.exports = {
  setupDatabase,
  cleanupDatabase,
  setupStrapi,
  cleanupStrapi,
};
