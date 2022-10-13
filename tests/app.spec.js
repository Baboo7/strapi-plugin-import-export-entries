const { readdirSync } = require('fs');

const { setupStrapi, cleanupStrapi, cleanupDatabase } = require('./helpers/strapi');

beforeAll(async () => {
  await setupStrapi();
});

afterAll(async () => {
  await cleanupStrapi();
});

afterEach(async () => {
  await cleanupDatabase();
});

it('strapi should be defined', () => {
  expect(strapi).toBeDefined();
});

const testFolder = `${__dirname}/tests`;
const testFiles = readdirSync(testFolder);
for (const testFile of testFiles) {
  require(`${testFolder}/${testFile}`);
}
