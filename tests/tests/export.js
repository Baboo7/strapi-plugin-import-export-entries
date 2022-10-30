const { getModel } = require('../../server/utils/models');
const { getService, SLUGS, generateData } = require('../utils');

describe('export service', () => {
  const CONFIG = {
    [SLUGS.COLLECTION_TYPE_SIMPLE]: [
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

  it('should export single type', async () => {
    await strapi.db.query(SLUGS.SINGLE_TYPE).create({
      data: { ...CONFIG[SLUGS.SINGLE_TYPE] },
    });

    const dataRaw = await getService('export').exportData({ slug: SLUGS.SINGLE_TYPE, exportFormat: 'json' });

    const data = JSON.parse(dataRaw);

    expect(data.title).toBe('my title');
    expect(data.description).toBe('my description');
  });

  describe('json v2', () => {
    it('should export collection type', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE_SIMPLE;
      await strapi.db.query(SLUG).createMany({
        data: [...CONFIG[SLUG]],
      });

      const dataRaw = await getService('export').exportDataV2({ slug: SLUG });

      const { data } = JSON.parse(dataRaw);

      expect(Object.values(data[SLUG]).length).toBe(CONFIG[SLUG].length);
      CONFIG[SLUG].forEach((configData) => {
        expect(data[SLUG][configData.id].id).toBe(configData.id);
        expect(data[SLUG][configData.id].title).toBe(configData.title);
        expect(data[SLUG][configData.id].description).toBe(configData.description);
        expect(data[SLUG][configData.id].startDateTime).toBe(configData.startDateTime);
        expect(data[SLUG][configData.id].enabled).toBe(configData.enabled);
      });
    });

    it('should export collection type localized with multiple locales', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE;
      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1, locale: 'en' }), generateData(SLUG, { locale: 'fr' }), generateData(SLUG, { locale: 'it' })],
      };

      await strapi.entityService.create(SLUG, { data: CONFIG[SLUG][0] });
      const createHandler = strapi.plugin('i18n').service('core-api').createCreateLocalizationHandler(getModel(SLUG));
      await createHandler({ id: CONFIG[SLUG][0].id, data: CONFIG[SLUG][1] });
      await createHandler({ id: CONFIG[SLUG][0].id, data: CONFIG[SLUG][2] });

      const dataRaw = await getService('export').exportDataV2({ slug: SLUG });

      const { data } = JSON.parse(dataRaw);

      const entries = Object.values(data[SLUG]);
      const entriesIds = Object.keys(data[SLUG]).map((id) => parseInt(id, 10));

      expect(entries.length).toBe(3);
      entries.forEach((entry, idx) => {
        const configData = CONFIG[SLUG][idx];
        if (configData.id) {
          expect(entry.id).toBe(configData.id);
        }
        expect(entry.title).toBe(configData.title);
        expect(entry.description).toBe(configData.description);
        expect(entry.startDateTime).toBe(configData.startDateTime);
        expect(entry.enabled).toBe(configData.enabled);
        expect(entry.locale).toBe(configData.locale);
        expect(entry.localizations.sort()).toEqual(entriesIds.filter((id) => id !== entry.id).sort());
      });
    });

    it('should export collection type with component', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE_SIMPLE;

      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1, component: generateData(SLUGS.COMPONENT_COMPONENT, { id: 1 }) })],
      };

      await Promise.all(CONFIG[SLUG].map((datum) => strapi.entityService.create(SLUG, { data: datum })));

      const dataRaw = await getService('export').exportDataV2({ slug: SLUG });
      const { data } = JSON.parse(dataRaw);

      expect(Object.keys(data[SLUG]).length).toBe(1);
      expect(Object.keys(data[SLUGS.COMPONENT_COMPONENT]).length).toBe(1);
      CONFIG[SLUG].forEach((config) => {
        const entry = data[SLUG][config.id];
        const componentEntry = data[SLUGS.COMPONENT_COMPONENT][config.component.id];
        expect(entry.id).toBe(config.id);
        expect(entry.title).toBe(config.title);
        expect(entry.description).toBe(config.description);
        expect(entry.startDateTime).toBe(config.startDateTime);
        expect(entry.enabled).toBe(config.enabled);
        expect(entry.component).toBe(config.component.id);
        expect(componentEntry.id).toBe(config.component.id);
        expect(componentEntry.name).toBe(config.component.name);
        expect(componentEntry.description).toBe(config.component.description);
      });
    });

    it('should export collection type with component repeatable', async () => {
      const SLUG = SLUGS.COLLECTION_TYPE_SIMPLE;

      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1, componentRepeatable: [generateData(SLUGS.COMPONENT_COMPONENT, { id: 1 }), generateData(SLUGS.COMPONENT_COMPONENT, { id: 2 })] })],
      };

      await Promise.all(CONFIG[SLUG].map((datum) => strapi.entityService.create(SLUG, { data: datum })));

      const dataRaw = await getService('export').exportDataV2({ slug: SLUG });
      const { data } = JSON.parse(dataRaw);

      expect(Object.keys(data[SLUG]).length).toBe(1);
      expect(Object.keys(data[SLUGS.COMPONENT_COMPONENT]).length).toBe(2);
      CONFIG[SLUG].forEach((config) => {
        const entry = data[SLUG][config.id];
        expect(entry.id).toBe(config.id);
        expect(entry.title).toBe(config.title);
        expect(entry.description).toBe(config.description);
        expect(entry.componentRepeatable).toEqual(config.componentRepeatable.map((c) => c.id));
        config.componentRepeatable.forEach((componentConfig) => {
          const componentEntry = data[SLUGS.COMPONENT_COMPONENT][componentConfig.id];
          expect(componentEntry.id).toBe(componentConfig.id);
          expect(componentEntry.name).toBe(componentConfig.name);
          expect(componentEntry.description).toBe(componentConfig.description);
        });
      });
    });

    it('should export single type localized', async () => {
      const CONFIG = {
        [SLUGS.SINGLE_TYPE]: [generateData(SLUGS.SINGLE_TYPE, { id: 1, locale: 'en' })],
      };

      await strapi.db.query(SLUGS.SINGLE_TYPE).createMany({
        data: [...CONFIG[SLUGS.SINGLE_TYPE]],
      });

      const dataRaw = await getService('export').exportDataV2({ slug: SLUGS.SINGLE_TYPE });

      const { data } = JSON.parse(dataRaw);

      expect(Object.values(data[SLUGS.SINGLE_TYPE]).length).toBe(1);
      CONFIG[SLUGS.SINGLE_TYPE].forEach((configData) => {
        expect(data[SLUGS.SINGLE_TYPE][configData.id].id).toBe(configData.id);
        expect(data[SLUGS.SINGLE_TYPE][configData.id].title).toBe(configData.title);
        expect(data[SLUGS.SINGLE_TYPE][configData.id].description).toBe(configData.description);
      });
    });

    it('should export single type localized with multiple locales', async () => {
      const CONFIG = {
        [SLUGS.SINGLE_TYPE]: [
          generateData(SLUGS.SINGLE_TYPE, { id: 1, locale: 'en' }),
          generateData(SLUGS.SINGLE_TYPE, { locale: 'fr' }),
          generateData(SLUGS.SINGLE_TYPE, { locale: 'it' }),
        ],
      };

      await strapi.entityService.create(SLUGS.SINGLE_TYPE, { data: CONFIG[SLUGS.SINGLE_TYPE][0] });
      const createHandler = strapi.plugin('i18n').service('core-api').createCreateLocalizationHandler(getModel(SLUGS.SINGLE_TYPE));
      await createHandler({ id: CONFIG[SLUGS.SINGLE_TYPE][0].id, data: CONFIG[SLUGS.SINGLE_TYPE][1] });
      await createHandler({ id: CONFIG[SLUGS.SINGLE_TYPE][0].id, data: CONFIG[SLUGS.SINGLE_TYPE][2] });

      const dataRaw = await getService('export').exportDataV2({ slug: SLUGS.SINGLE_TYPE });

      const { data } = JSON.parse(dataRaw);

      const entries = Object.values(data[SLUGS.SINGLE_TYPE]);
      const entriesIds = Object.keys(data[SLUGS.SINGLE_TYPE]).map((id) => parseInt(id, 10));

      expect(entries.length).toBe(3);
      entries.forEach((entry, idx) => {
        const configData = CONFIG[SLUGS.SINGLE_TYPE][idx];
        if (configData.id) {
          expect(entry.id).toBe(configData.id);
        }
        expect(entry.title).toBe(configData.title);
        expect(entry.description).toBe(configData.description);
        expect(entry.locale).toBe(configData.locale);
        expect(entry.localizations.sort()).toEqual(entriesIds.filter((id) => id !== entry.id).sort());
      });
    });

    it('should export single type with component', async () => {
      const SLUG = SLUGS.SINGLE_TYPE_SIMPLE;

      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1, component: generateData(SLUGS.COMPONENT_COMPONENT, { id: 1 }) })],
      };

      await Promise.all(CONFIG[SLUG].map((datum) => strapi.entityService.create(SLUG, { data: datum })));

      const dataRaw = await getService('export').exportDataV2({ slug: SLUG });
      const { data } = JSON.parse(dataRaw);

      expect(Object.keys(data[SLUG]).length).toBe(1);
      expect(Object.keys(data[SLUGS.COMPONENT_COMPONENT]).length).toBe(1);
      CONFIG[SLUG].forEach((config) => {
        const entry = data[SLUG][config.id];
        const componentEntry = data[SLUGS.COMPONENT_COMPONENT][config.component.id];
        expect(entry.id).toBe(config.id);
        expect(entry.title).toBe(config.title);
        expect(entry.description).toBe(config.description);
        expect(entry.component).toBe(config.component.id);
        expect(componentEntry.id).toBe(config.component.id);
        expect(componentEntry.name).toBe(config.component.name);
        expect(componentEntry.description).toBe(config.component.description);
      });
    });

    it('should export single type with component repeatable', async () => {
      const SLUG = SLUGS.SINGLE_TYPE_SIMPLE;

      const CONFIG = {
        [SLUG]: [generateData(SLUG, { id: 1, componentRepeatable: [generateData(SLUGS.COMPONENT_COMPONENT, { id: 1 }), generateData(SLUGS.COMPONENT_COMPONENT, { id: 2 })] })],
      };

      await Promise.all(CONFIG[SLUG].map((datum) => strapi.entityService.create(SLUG, { data: datum })));

      const dataRaw = await getService('export').exportDataV2({ slug: SLUG });
      const { data } = JSON.parse(dataRaw);

      expect(Object.keys(data[SLUG]).length).toBe(1);
      expect(Object.keys(data[SLUGS.COMPONENT_COMPONENT]).length).toBe(2);
      CONFIG[SLUG].forEach((config) => {
        const entry = data[SLUG][config.id];
        expect(entry.id).toBe(config.id);
        expect(entry.title).toBe(config.title);
        expect(entry.description).toBe(config.description);
        expect(entry.componentRepeatable).toEqual(config.componentRepeatable.map((c) => c.id));
        config.componentRepeatable.forEach((componentConfig) => {
          const componentEntry = data[SLUGS.COMPONENT_COMPONENT][componentConfig.id];
          expect(componentEntry.id).toBe(componentConfig.id);
          expect(componentEntry.name).toBe(componentConfig.name);
          expect(componentEntry.description).toBe(componentConfig.description);
        });
      });
    });
  });
});
