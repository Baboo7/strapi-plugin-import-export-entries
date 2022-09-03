const { getService } = require('./utils');

describe('export service', () => {
  it('should export single type', async () => {
    const dataRaw = await getService('export').exportData({ slug: 'api::single-type.single-type', exportFormat: 'json' });

    const data = JSON.parse(dataRaw);

    expect(data.title).toBe('my title');
    expect(data.description).toBe('my description');
  });
});
