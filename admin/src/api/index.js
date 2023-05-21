import { request } from '@strapi/helper-plugin';

import pluginId from '../pluginId';

export const api = {
  exportData,
  getModelAttributes,
  importData,
};

async function exportData({ slug, search, applySearch, exportFormat, relationsAsId, deepness, exportPluginsContentTypes }) {
  const data = await request(`/${pluginId}/export/contentTypes`, {
    method: 'POST',
    body: { slug, search, applySearch, exportFormat, relationsAsId, deepness, exportPluginsContentTypes },
  });
  return data;
}

/**
 * Get the attributes of a model.
 * @param {Object} options
 * @param {string} options.slug - Slug of the model.
 * @returns
 */
async function getModelAttributes({ slug }) {
  const resData = await request(`/${pluginId}/import/model-attributes/${slug}`, {
    method: 'GET',
  });
  return resData.data.attribute_names;
}

async function importData({ slug, data, format, idField }) {
  const resData = await request(`/${pluginId}/import`, {
    method: 'POST',
    body: { slug, data, format, idField },
  });
  return resData;
}
