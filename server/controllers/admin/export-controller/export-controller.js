'use strict';

const qs = require('qs');

const { ObjectBuilder } = require('../../../../libs/objects');
const { getService } = require('../../../utils');

const exportData = async (ctx) => {
  if (!hasPermissions(ctx)) {
    return ctx.forbidden();
  }

  let { slug, search, applySearch, exportFormat, relationsAsId } = ctx.request.body;

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

const hasPermissions = (ctx) => {
  let { slug } = ctx.request.body;
  const { userAbility } = ctx.state;

  const permissionChecker = strapi.plugin('content-manager').service('permission-checker').create({ userAbility, model: slug });

  return permissionChecker.can.read();
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
  exportData,
});
