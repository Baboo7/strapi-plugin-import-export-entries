const { getService, SLUGS } = require('../utils');

describe('import service', () => {
  const CONFIG = {
    [SLUGS.COLLECTION_TYPE]: [
      {
        id: 1,
        title: 'my collection title',
        description: 'my collection description',
        startDateTime: '2022-10-10T12:30:15.000Z',
        enabled: true,
        createdAt: '2022-09-01T09:00:00.000Z',
        updatedAt: '2022-09-01T09:00:00.000Z',
        publishedAt: null,
        createdBy: null,
        updatedBy: null,
      },
      {
        id: 2,
        title: 'my second collection title',
        description: 'my second collection description',
        startDateTime: '2022-10-20T12:30:15.000Z',
        enabled: false,
        createdAt: '2022-09-01T09:00:00.000Z',
        updatedAt: '2022-09-01T09:00:00.000Z',
        publishedAt: null,
        createdBy: null,
        updatedBy: null,
      },
    ],
    [SLUGS.SINGLE_TYPE]: [
      {
        id: 1,
        title: 'my title',
        description: 'my description',
      },
    ],
  };

  describe('json v2', () => {
    it('should import collection type', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE;
      const fileContent = {
        version: 2,
        data: {
          [SLUG]: Object.fromEntries(CONFIG[SLUG].map((data) => [data.id, data])),
        },
      };

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany();

      expect(failures.length).toBe(0);
      expect(entries.length).toBe(CONFIG[SLUG].length);
      CONFIG[SLUG].forEach((configData, idx) => {
        expect(entries[idx].id).toBe(configData.id);
        expect(entries[idx].title).toBe(configData.title);
        expect(entries[idx].description).toBe(configData.description);
        expect(entries[idx].startDateTime).toBe(configData.startDateTime);
        expect(entries[idx].enabled).toBe(configData.enabled);
      });
    });

    it('should import single type', async () => {
      const SLUG = SLUGS.SINGLE_TYPE;
      const fileContent = {
        version: 2,
        data: {
          [SLUG]: Object.fromEntries(CONFIG[SLUG].map((data) => [data.id, data])),
        },
      };

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany();

      expect(failures.length).toBe(0);
      expect(entries.length).toBe(CONFIG[SLUG].length);
      CONFIG[SLUG].forEach((configData, idx) => {
        expect(entries[idx].id).toBe(configData.id);
        expect(entries[idx].title).toBe(configData.title);
        expect(entries[idx].description).toBe(configData.description);
      });
    });
  });
});
