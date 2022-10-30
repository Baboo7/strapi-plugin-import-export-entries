const map = require('lodash/map');
const pick = require('lodash/pick');
const { getModel } = require('../../server/utils/models');

const { getService, SLUGS, generateData } = require('../utils');

describe('import service', () => {
  describe('json v2', () => {
    it('should create collection type', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE_SIMPLE;
      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1 }), generateData(SLUG, { id: 2 })],
      };

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

    it('should update partially collection type', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE_SIMPLE;

      const CONFIG_CREATE = {
        [SLUG]: [generateData(SLUG, { id: 1 })],
      };

      await Promise.all(CONFIG_CREATE[SLUG].map((datum) => strapi.entityService.create(SLUG, { data: datum })));

      const CONFIG_UPDATE = {
        [SLUG]: [pick(generateData(SLUG, { id: 1 }), ['id', 'description', 'startDateTime'])],
      };

      const fileContent = buildJsonV2FileContent(CONFIG_UPDATE);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany();

      const [entry] = entries;

      expect(failures.length).toBe(0);
      expect(entries.length).toBe(CONFIG_UPDATE[SLUG].length);
      expect(entry.id).toBe(CONFIG_CREATE[SLUG][0].id);
      expect(entry.title).toBe(CONFIG_CREATE[SLUG][0].title);
      expect(entry.description).toBe(CONFIG_UPDATE[SLUG][0].description);
      expect(entry.startDateTime).toBe(CONFIG_UPDATE[SLUG][0].startDateTime);
      expect(entry.enabled).toBe(CONFIG_CREATE[SLUG][0].enabled);
    });

    it('should create collection type localized', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE;
      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1, locale: 'en' })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.entityService.findMany(SLUG, { populate: '*' });

      expect(failures.length).toBe(0);
      expect(entries.length).toBe(CONFIG[SLUG].length);
      entries.forEach((entry, idx) => {
        const configData = CONFIG[SLUG][idx];
        if (configData.id) {
          expect(entry.id).toBe(configData.id);
        }
        expect(entry.title).toBe(configData.title);
        expect(entry.description).toBe(configData.description);
        expect(entry.locale).toBe(configData.locale);
        expect(entry.localizations).toEqual([]);
      });
    });

    it('should update collection type localized', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE;

      await strapi.entityService.create(SLUG, { data: generateData(SLUG, { id: 1, locale: 'en' }) });

      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1, locale: 'en' })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.entityService.findMany(SLUG, { populate: '*' });

      expect(failures.length).toBe(0);
      expect(entries.length).toBe(CONFIG[SLUG].length);
      entries.forEach((entry, idx) => {
        const configData = CONFIG[SLUG][idx];
        if (configData.id) {
          expect(entry.id).toBe(configData.id);
        }
        expect(entry.title).toBe(configData.title);
        expect(entry.description).toBe(configData.description);
        expect(entry.locale).toBe(configData.locale);
        expect(entry.localizations).toEqual([]);
      });
    });

    it('should create collection type localized with multiple locales', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE;
      const CONFIG = {
        [SLUG]: [
          generateData(SLUG, { id: 2, locale: 'en' }),
          generateData(SLUG, { id: 1, locale: 'fr', localizations: [2] }),
          generateData(SLUG, { id: 3, locale: 'it', localizations: [2] }),
        ],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db
        .query(SLUG)
        .findMany({ populate: ['localizations'] })
        .then((entries) =>
          entries.map((e) => {
            e.localizations = e.localizations.map((l) => l.id);
            return e;
          }),
        );
      const entriesIds = entries.map((e) => e.id);

      expect(failures.length).toBe(0);
      entries.forEach((entry, idx) => {
        const configData = CONFIG[SLUG][idx];
        // Atm it is not possible to set the `id` for locales that are not the default one.
        if (entry.locale === 'en') {
          expect(entry.id).toBe(configData.id);
        }
        expect(entry.title).toBe(configData.title);
        expect(entry.description).toBe(configData.description);
        expect(entry.locale).toBe(configData.locale);
        expect(entry.localizations.sort()).toEqual(entriesIds.filter((id) => id !== entry.id).sort());
      });
    });

    it('should update partially collection type localized with multiple locales', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE;

      const CONFIG_CREATE = {
        [SLUG]: [generateData(SLUG, { id: 2, locale: 'en' }), generateData(SLUG, { id: 1, locale: 'fr' }), generateData(SLUG, { id: 3, locale: 'it' })],
      };

      // Create data.
      await (async () => {
        await strapi.db.query(SLUG).create({ data: CONFIG_CREATE[SLUG][0] });
        const createHandler = strapi.plugin('i18n').service('core-api').createCreateLocalizationHandler(getModel(SLUG));
        await createHandler({ id: CONFIG_CREATE[SLUG][0].id, data: CONFIG_CREATE[SLUG][1] });
        await createHandler({ id: CONFIG_CREATE[SLUG][0].id, data: CONFIG_CREATE[SLUG][2] });
      })();

      const CONFIG_UPDATE = {
        [SLUG]: [
          pick(generateData(SLUG, { id: 2, locale: 'en' }), ['id', 'locale', 'localizations', 'description', 'startDateTime']),
          pick(generateData(SLUG, { id: 1, locale: 'fr', localizations: [2] }), ['id', 'locale', 'localizations', 'description', 'startDateTime']),
          pick(generateData(SLUG, { id: 3, locale: 'it', localizations: [2] }), ['id', 'locale', 'localizations', 'description', 'startDateTime']),
        ],
      };

      const fileContent = buildJsonV2FileContent(CONFIG_UPDATE);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db
        .query(SLUG)
        .findMany({ populate: ['localizations'] })
        .then((entries) =>
          entries.map((e) => {
            e.localizations = e.localizations.map((l) => l.id);
            return e;
          }),
        );
      const entriesIds = entries.map((e) => e.id);

      expect(failures.length).toBe(0);
      entries.forEach((entry) => {
        const createConfigData = CONFIG_CREATE[SLUG].find((c) => c.locale === entry.locale);
        const updateConfigData = CONFIG_UPDATE[SLUG].find((c) => c.locale === entry.locale);

        // Atm it is not possible to set the `id` for locales that are not the default one.
        if (entry.locale === 'en') {
          expect(entry.id).toBe(createConfigData.id);
        }
        expect(entry.title).toBe(createConfigData.title);
        expect(entry.description).toBe(updateConfigData.description);
        expect(entry.startDateTime).toBe(updateConfigData.startDateTime);
        expect(entry.enabled).toBe(createConfigData.enabled);
        expect(entry.locale).toBe(createConfigData.locale);
        expect(entry.localizations.sort()).toEqual(entriesIds.filter((id) => id !== entry.id).sort());
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
        [SLUG]: [generateData(SLUG, { id: 1, locale: 'en' })],
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

      await strapi.entityService.create(SLUG, { data: generateData(SLUG, { id: 1 }) });

      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1, locale: 'en' })],
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
        [SLUG]: [generateData(SLUG, { id: 1, locale: 'en' }), generateData(SLUG, { id: 2, locale: 'fr' }), generateData(SLUG, { id: 3, locale: 'it' })],
      };

      const fileContent = buildJsonV2FileContent(CONFIG);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db.query(SLUG).findMany();

      expect(failures.length).toBe(0);
      entries.forEach((entry, idx) => {
        const configData = CONFIG[SLUG][idx];
        // Atm it is not possible to set the `id` for locales that are not the default one.
        if (idx === 0) {
          expect(entry.id).toBe(configData.id);
        }
        expect(entry.title).toBe(configData.title);
        expect(entry.description).toBe(configData.description);
        expect(entry.locale).toBe(configData.locale);
      });
    });

    it('should update partially single type localized with multiple locales', async () => {
      const SLUG = SLUGS.SINGLE_TYPE;

      const CONFIG_CREATE = {
        [SLUG]: [generateData(SLUG, { id: 2, locale: 'en' }), generateData(SLUG, { id: 1, locale: 'fr' }), generateData(SLUG, { id: 3, locale: 'it' })],
      };

      // Create data.
      await (async () => {
        await strapi.db.query(SLUG).create({ data: CONFIG_CREATE[SLUG][0] });
        const createHandler = strapi.plugin('i18n').service('core-api').createCreateLocalizationHandler(getModel(SLUG));
        await createHandler({ id: CONFIG_CREATE[SLUG][0].id, data: CONFIG_CREATE[SLUG][1] });
        await createHandler({ id: CONFIG_CREATE[SLUG][0].id, data: CONFIG_CREATE[SLUG][2] });
      })();

      const CONFIG_UPDATE = {
        [SLUG]: [
          pick(generateData(SLUG, { id: 2, locale: 'en' }), ['id', 'locale', 'description']),
          pick(generateData(SLUG, { id: 1, locale: 'fr' }), ['id', 'locale', 'description']),
          pick(generateData(SLUG, { id: 3, locale: 'it' }), ['id', 'locale', 'description']),
        ],
      };

      const fileContent = buildJsonV2FileContent(CONFIG_UPDATE);

      const { failures } = await getService('import').importDataV2(fileContent, { slug: SLUG, user: {}, idField: 'id' });

      const entries = await strapi.db
        .query(SLUG)
        .findMany({ populate: ['localizations'] })
        .then((entries) =>
          entries.map((e) => {
            e.localizations = e.localizations.map((l) => l.id);
            return e;
          }),
        );
      const entriesIds = entries.map((e) => e.id);

      expect(failures.length).toBe(0);
      entries.forEach((entry) => {
        const createConfigData = CONFIG_CREATE[SLUG].find((c) => c.locale === entry.locale);
        const updateConfigData = CONFIG_UPDATE[SLUG].find((c) => c.locale === entry.locale);

        // Atm it is not possible to set the `id` for locales that are not the default one.
        if (entry.locale === 'en') {
          expect(entry.id).toBe(createConfigData.id);
        }
        expect(entry.title).toBe(createConfigData.title);
        expect(entry.description).toBe(updateConfigData.description);
        expect(entry.locale).toBe(createConfigData.locale);
        expect(entry.localizations.sort()).toEqual(entriesIds.filter((id) => id !== entry.id).sort());
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
