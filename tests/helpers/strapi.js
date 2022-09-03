const Strapi = require('@strapi/strapi');
const fs = require('fs');

const DELETE_DB_ENABLED = false;
const CLEANUP_DB_ENABLED = true;

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

async function cleanupDatabase() {
  if (CLEANUP_DB_ENABLED) {
    const cleaningCollections = Array.from(strapi.db.metadata)
      .map(([collectionName]) => collectionName)
      .filter((collectionName) => collectionName.startsWith('api::'))
      .map((collectionName) =>
        strapi.db.query(collectionName).deleteMany({
          where: {
            createdAt: { $gt: '1900-01-01T00:00:00.000Z' },
          },
        }),
      );

    await Promise.all(cleaningCollections);
  }
}

module.exports = {
  cleanupDatabase,
  setupStrapi,
  cleanupStrapi,
};
