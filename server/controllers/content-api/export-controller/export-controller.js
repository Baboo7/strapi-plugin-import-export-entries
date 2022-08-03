'use strict';

const Joi = require('joi');
const qs = require('qs');

const { ObjectBuilder } = require('../../../../libs/objects');
const { getService } = require('../../../utils');
const { checkParams, handleAsyncError } = require('../utils');

const bodySchema = Joi.object({
  slug: Joi.string().required(),
  exportFormat: Joi.string().valid('csv', 'json').required(),
  search: Joi.string().default(''),
  applySearch: Joi.boolean().default(false),
  relationsAsId: Joi.boolean().default(false),
});

const exportData = async (ctx) => {
  let { slug, search, applySearch, exportFormat, relationsAsId } = checkParams(bodySchema, ctx.request.body);

  const queryBuilder = new ObjectBuilder();
  queryBuilder.extend(getService('export').getPopulateFromSchema(slug));
  if (applySearch) {
    queryBuilder.extend(buildFilterQuery(search));
  }
  const query = queryBuilder.get();

  const entries = await strapi.entityService.findMany(slug, query);

  const data = getService('export').exportData(entries, {
    slug,
    dataFormat: exportFormat,
    relationsAsId,
  });

  ctx.body = {
    data,
  };
};

const buildFilterQuery = (search) => {
  let { filters, sort: sortRaw } = qs.parse(search);

  const [attr, value] = (sortRaw?.split(':') || []).map((v) => v.toLowerCase());
  let sort = {};
  if (attr && value) {
    sort[attr] = value;
  }

  return {
    filters,
    sort,
  };
};

module.exports = ({ strapi }) => ({
  exportData: handleAsyncError(exportData),
});
