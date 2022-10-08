const { getService } = require('../utils');

const SLUGS = {
  COLLECTION_TYPE: 'api::collection-type.collection-type',
  SINGLE_TYPE: 'api::single-type.single-type',
};

describe('export service', () => {
  const CONFIG = {
    [SLUGS.COLLECTION_TYPE]: [
      {
        id: 1,
        title: 'my collection title',
        description: 'my collection description',
        startDateTime: '2022-10-10T12:30:15.000Z',
        enabled: true,
      },
      {
        id: 2,
        title: 'my second collection title',
        description: 'my second collection description',
        startDateTime: '2022-10-20T12:30:15.000Z',
        enabled: false,
      },
    ],
    [SLUGS.SINGLE_TYPE]: {
      id: 1,
      title: 'my title',
      description: 'my description',
    },
  };

  beforeEach(async () => {
    await strapi.db.query(SLUGS.SINGLE_TYPE).create({
      data: { ...CONFIG[SLUGS.SINGLE_TYPE] },
    });
    await strapi.db.query(SLUGS.COLLECTION_TYPE).createMany({
      data: [...CONFIG[SLUGS.COLLECTION_TYPE]],
    });
  });

  it('should export single type', async () => {
    const dataRaw = await getService('export').exportData({ slug: SLUGS.SINGLE_TYPE, exportFormat: 'json' });

    const data = JSON.parse(dataRaw);

    expect(data.title).toBe('my title');
    expect(data.description).toBe('my description');
  });

  describe('json v2', () => {
    it('should export collection type', async () => {
      const dataRaw = await getService('export').exportDataV2({ slug: SLUGS.COLLECTION_TYPE });

      const { data } = JSON.parse(dataRaw);

      expect(Object.values(data[SLUGS.COLLECTION_TYPE]).length).toBe(CONFIG[SLUGS.COLLECTION_TYPE].length);
      CONFIG[SLUGS.COLLECTION_TYPE].forEach((configData) => {
        expect(data[SLUGS.COLLECTION_TYPE][configData.id].id).toBe(configData.id);
        expect(data[SLUGS.COLLECTION_TYPE][configData.id].title).toBe(configData.title);
        expect(data[SLUGS.COLLECTION_TYPE][configData.id].description).toBe(configData.description);
        expect(data[SLUGS.COLLECTION_TYPE][configData.id].startDateTime).toBe(configData.startDateTime);
        expect(data[SLUGS.COLLECTION_TYPE][configData.id].enabled).toBe(configData.enabled);
      });
    });

    it('should export single type', async () => {
      const dataRaw = await getService('export').exportDataV2({ slug: SLUGS.SINGLE_TYPE });

      const { data } = JSON.parse(dataRaw);

      expect(Object.values(data[SLUGS.SINGLE_TYPE]).length).toBe(1);
      expect(data[SLUGS.SINGLE_TYPE][CONFIG[SLUGS.SINGLE_TYPE].id].title).toBe('my title');
      expect(data[SLUGS.SINGLE_TYPE][CONFIG[SLUGS.SINGLE_TYPE].id].description).toBe('my description');
    });
  });
});
