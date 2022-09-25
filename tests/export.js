const { getService } = require('./utils');

describe('export service', () => {
  beforeEach(async () => {
    await strapi.db.query('api::single-type.single-type').create({
      data: { title: 'my title', description: 'my description' },
    });
  });

  it('should export single type', async () => {
    const dataRaw = await getService('export').exportData({ slug: 'api::single-type.single-type', exportFormat: 'json' });

    const data = JSON.parse(dataRaw);

    expect(data.title).toBe('my title');
    expect(data.description).toBe('my description');
  });
});
