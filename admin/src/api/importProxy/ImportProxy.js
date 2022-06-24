import { request } from '@strapi/helper-plugin';

import pluginId from '../../pluginId';

/**
 * Get the attributes of a model.
 * @param {Object} options
 * @param {string} options.slug - Slug of the model.
 * @returns
 */
const getModelAttributes = async ({ slug }) => {
  const resData = await request(`/${pluginId}/import/model-attributes/${slug}`, {
    method: 'GET',
  });
  return resData.data.attribute_names;
};

const importData = async ({ slug, data, format, idField }) => {
  const resData = await request(`/${pluginId}/import`, {
    method: 'POST',
    body: { slug, data, format, idField },
  });
  return resData;
};

export default {
  getModelAttributes,
  importData,
};
