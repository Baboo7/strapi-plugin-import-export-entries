const { setupStrapi, cleanupStrapi, cleanupDatabase } = require('./helpers/strapi');

beforeAll(async () => {
  await setupStrapi();
});

afterAll(async () => {
  await cleanupStrapi();
});

afterEach(async () => {
  cleanupDatabase();
});

it('strapi should be defined', () => {
  expect(strapi).toBeDefined();
});

require('./export');
