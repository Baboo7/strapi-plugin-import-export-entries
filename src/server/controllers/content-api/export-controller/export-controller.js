'use strict';

const Joi = require('joi');

const { getService } = require('../../../utils');
const { checkParams, handleAsyncError } = require('../utils');

const bodySchema = Joi.object({
  slug: Joi.string().required(),
  exportFormat: Joi.string().valid('csv', 'json', 'json-v2').required(),
  search: Joi.string().default(''),
  applySearch: Joi.boolean().default(false),
  relationsAsId: Joi.boolean().default(false),
  deepness: Joi.number().integer().min(1).default(5),
});

const exportData = async (ctx) => {
  let { slug, search, applySearch, exportFormat, relationsAsId, deepness } = checkParams(bodySchema, ctx.request.body);

  let data;
  if (exportFormat === getService('export').formats.JSON_V2) {
    data = await getService('export').exportDataV2({ slug, search, applySearch, deepness });
  } else {
    data = await getService('export').exportData({ slug, search, applySearch, exportFormat, relationsAsId, deepness });
  }

  ctx.body = {
    data,
  };
};

module.exports = ({ strapi }) => ({
  exportData: handleAsyncError(exportData),
});
