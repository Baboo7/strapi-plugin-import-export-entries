"use strict";

const qs = require("qs");

const exportData = async (ctx) => {
  if (!hasPermissions(ctx)) {
    return ctx.forbidden();
  }

  let { slug, search, applySearch } = ctx.request.body;

  let query = {};
  if (applySearch) {
    query = buildFilterQuery(search);
  }

  const entries = await strapi.db.query(slug).findMany(query);

  ctx.body = {
    data: entries,
  };
};

const hasPermissions = (ctx) => {
  let { slug } = ctx.request.body;
  const { userAbility } = ctx.state;

  const permissionChecker = strapi
    .plugin("content-manager")
    .service("permission-checker")
    .create({ userAbility, model: slug });

  return permissionChecker.can.read();
};

const buildFilterQuery = (search) => {
  let { filters, sort } = qs.parse(search);

  let where = filters;

  const [attr, value] = sort?.split(":").map((v) => v.toLowerCase());
  let orderBy = {};
  if (attr && value) {
    orderBy[attr] = value;
  }

  return {
    where,
    orderBy,
  };
};

module.exports = ({ strapi }) => ({
  exportData,
});
