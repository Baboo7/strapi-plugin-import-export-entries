const { setupStrapi, cleanupStrapi, cleanupDatabase } = require('./helpers/strapi');

beforeAll(async () => {
  await setupStrapi();
});

afterAll(async () => {
  await cleanupStrapi();
});

beforeEach(async () => {
  await strapi.db.query('api::single-type.single-type').create({
    data: { title: 'my title', description: 'my description' },
  });
});

afterEach(async () => {
  cleanupDatabase();
});

it('strapi should be defined', () => {
  expect(strapi).toBeDefined();
});

require('./export');
