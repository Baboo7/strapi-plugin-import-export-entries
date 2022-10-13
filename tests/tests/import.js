const map = require('lodash/map');

const { getService, SLUGS, generateData } = require('../utils');

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

    it('should import relations in any order', async () => {
      const CONFIG = {
        [SLUGS.RELATION_A]: [generateData(SLUGS.RELATION_A, { id: 1, relationOneToOne: 1 })],
        [SLUGS.RELATION_B]: [generateData(SLUGS.RELATION_B, { id: 1 })],
      };

      const fileContent = {
        version: 2,
        data: Object.fromEntries(map(CONFIG, (data, slug) => [slug, Object.fromEntries(data.map((datum) => [datum.id, datum]))])),
      };

      console.log('fileContent', fileContent);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUGS.RELATION_A, user: {}, idField: 'id' });

      const [entriesA, entriesB] = await Promise.all([strapi.db.query(SLUGS.RELATION_A).findMany(), strapi.db.query(SLUGS.RELATION_B).findMany()]);

      expect(failures.length).toBe(0);

      expect(entriesA.length).toBe(CONFIG[SLUGS.RELATION_A].length);
      CONFIG[SLUGS.RELATION_A].forEach((configData, idx) => {
        expect(entriesA[idx].id).toBe(configData.id);
        expect(entriesA[idx].title).toBe(configData.title);
        expect(entriesA[idx].description).toBe(configData.description);
      });

      expect(entriesB.length).toBe(CONFIG[SLUGS.RELATION_B].length);
      CONFIG[SLUGS.RELATION_B].forEach((configData, idx) => {
        expect(entriesB[idx].id).toBe(configData.id);
        expect(entriesB[idx].title).toBe(configData.title);
        expect(entriesB[idx].description).toBe(configData.description);
      });
    });

    it('should have failures if missing required field', async () => {
      const CONFIG = {
        [SLUGS.RELATION_A]: [{ id: 1 }],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUGS.RELATION_A, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUGS.RELATION_A).findMany();

      expect(failures.length).toBeGreaterThanOrEqual(1);
      expect(entries.length).toBe(0);
    });
  });
});

const buildJsonV2FileContent = (config) => {
  return {
    version: 2,
    data: Object.fromEntries(map(config, (data, slug) => [slug, Object.fromEntries(data.map((datum) => [datum.id, datum]))])),
  };
};
