const { getModel } = require('../../server/utils/models');
const { getService, SLUGS, generateData } = require('../utils');

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
      await strapi.db.query(SLUGS.COLLECTION_TYPE).createMany({
        data: [...CONFIG[SLUGS.COLLECTION_TYPE]],
      });

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

    it('should export single type with multiple locales', async () => {
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
  });
});
