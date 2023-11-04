const FakerJs = require('@faker-js/faker');

const pluginId = require('./pluginId');

const { faker } = FakerJs;

const SLUGS = {
  COLLECTION_TYPE: 'api::collection-type.collection-type',
  COLLECTION_TYPE_SIMPLE: 'api::collection-type.collection-type-simple',
  COMPONENT_COMPONENT: 'component.component',
  RELATION_A: 'api::with-relation.relation-a',
  RELATION_B: 'api::with-relation.relation-b',
  RELATION_C: 'api::with-relation.relation-c',
  RELATION_D: 'api::with-relation.relation-d',
  SINGLE_TYPE: 'api::single-type.single-type',
  SINGLE_TYPE_SIMPLE: 'api::single-type.single-type-simple',
};

const generateData = (slug, customData = {}) => {
  if (slug === SLUGS.COLLECTION_TYPE) {
    return {
      title: faker.helpers.unique(faker.word.noun),
      description: faker.helpers.unique(faker.word.noun),
      // startDateTime: faker.date.recent().toISOString(),
      enabled: faker.datatype.boolean(),
      ...customData,
    };
  }
  if (slug === SLUGS.COLLECTION_TYPE_SIMPLE) {
    return {
      title: faker.helpers.unique(faker.word.noun),
      description: faker.helpers.unique(faker.word.noun),
      // startDateTime: faker.date.recent().toISOString(),
      enabled: faker.datatype.boolean(),
      ...customData,
    };
  }
  if (slug === SLUGS.COMPONENT_COMPONENT) {
    return {
      name: faker.helpers.unique(faker.word.noun),
      description: faker.helpers.unique(faker.word.noun),
      ...customData,
    };
  }
  if (slug === SLUGS.RELATION_A) {
    return {
      name: faker.helpers.unique(faker.word.noun),
      ...customData,
    };
  }
  if (slug === SLUGS.RELATION_B) {
    return {
      name: faker.helpers.unique(faker.word.noun),
      ...customData,
    };
  }
  if (slug === SLUGS.RELATION_C) {
    return {
      name: faker.helpers.unique(faker.word.noun),
      ...customData,
    };
  }
  if (slug === SLUGS.RELATION_D) {
    return {
      name: faker.helpers.unique(faker.word.noun),
      ...customData,
    };
  }
  if (slug === SLUGS.SINGLE_TYPE) {
    return {
      title: faker.helpers.unique(faker.word.noun),
      description: faker.helpers.unique(faker.word.noun),
      ...customData,
    };
  }
  if (slug === SLUGS.SINGLE_TYPE_SIMPLE) {
    return {
      title: faker.helpers.unique(faker.word.noun),
      description: faker.helpers.unique(faker.word.noun),
      ...customData,
    };
  }

  throw new Error(`Data generation is not supported for slug ${slug}`);
};

/**
 * ServiceName.
 * @typedef {("export"|"import")} ServiceName
 */

/**
 * Get a plugin service.
 * @param {ServiceName} serviceName
 * @returns
 */
const getService = (serviceName) => {
  return strapi.plugin(pluginId).service(serviceName);
};

module.exports = {
  SLUGS,
  generateData,
  getService,
};
