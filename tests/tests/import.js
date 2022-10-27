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

    it('should create single type', async () => {
      const SLUG = SLUGS.SINGLE_TYPE_SIMPLE;
      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1 })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

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

    it('should update single type', async () => {
      const SLUG = SLUGS.SINGLE_TYPE_SIMPLE;

      await strapi.entityService.create(SLUG, { data: generateData(SLUG, { id: 1 }) });

      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1 })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

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

    it('should create single type localized', async () => {
      const SLUG = SLUGS.SINGLE_TYPE;
      const CONFIG = {
        [SLUG]: [generateData(SLUGS.SINGLE_TYPE, { id: 1, locale: 'en' })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

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

    it('should update single type localized', async () => {
      const SLUG = SLUGS.SINGLE_TYPE;

      await strapi.entityService.create(SLUG, { data: generateData(SLUGS.SINGLE_TYPE, { id: 1 }) });

      const CONFIG = {
        [SLUG]: [generateData(SLUGS.SINGLE_TYPE, { id: 1, locale: 'en' })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

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

    it('should create single type localized with multiple locales', async () => {
      const SLUG = SLUGS.SINGLE_TYPE;
      const CONFIG = {
        [SLUG]: [
          generateData(SLUGS.SINGLE_TYPE, { id: 1, locale: 'en' }),
          generateData(SLUGS.SINGLE_TYPE, { id: 2, locale: 'fr' }),
          generateData(SLUGS.SINGLE_TYPE, { id: 3, locale: 'it' }),
        ],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany();

      expect(failures.length).toBe(0);
      entries.forEach((entry, idx) => {
        const configData = CONFIG[SLUGS.SINGLE_TYPE][idx];
        if (idx === 0) {
          expect(entry.id).toBe(configData.id);
        }
        expect(entry.title).toBe(configData.title);
        expect(entry.description).toBe(configData.description);
        expect(entry.locale).toBe(configData.locale);
      });
    });

    it('should import relations in any order', async () => {
      const CONFIG = {
        [SLUGS.RELATION_A]: [generateData(SLUGS.RELATION_A, { id: 1, relationOneToOne: 1 })],
        [SLUGS.RELATION_B]: [generateData(SLUGS.RELATION_B, { id: 1 })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

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
