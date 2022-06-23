"use strict";

const qs = require("qs");

const { ObjectBuilder } = require("../../libs/objects");
const { getService, Services } = require("../utils");

const exportData = async (ctx) => {
  if (!hasPermissions(ctx)) {
    return ctx.forbidden();
  }

  let { slug, search, applySearch, exportFormat, relationsAsId } =
    ctx.request.body;

  const schema = strapi.getModel(slug).__schema__;
  const populate = getPopulateFromSchema(schema);

  const queryBuilder = new ObjectBuilder();

  queryBuilder.extend({ populate: populate });
  if (applySearch) {
    queryBuilder.extend(buildFilterQuery(search));
  }
  const query = queryBuilder.get();

  const entries = await strapi.entityService.findMany(slug, query);

  const data = getService("data-converter").convertEntries(entries, {
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

  const permissionChecker = strapi
    .plugin("content-manager")
    .service("permission-checker")
    .create({ userAbility, model: slug });

  return permissionChecker.can.read();
};

const buildFilterQuery = (search) => {
  let { filters, sort: sortRaw } = qs.parse(search);

  const [attr, value] = sortRaw?.split(":").map((v) => v.toLowerCase());
  let sort = {};
  if (attr && value) {
    sort[attr] = value;
  }

  return {
    filters,
    sort,
  };
};

const populateAttribute = function({ components }) {
  if (components) {
    const populate = components.reduce((currentValue, current) => {
      return { ...currentValue, [current.split(".").pop()]: { populate: "*" } };
    }, {});
    return { populate };
  }
  return { populate: "*" };
}

 const  getPopulateFromSchema = function (schema)  { 
  let populate = Object.keys(schema.attributes).reduce((currentValue, current) => {
    const attribute = schema.attributes[current];

    if (!["dynamiczone", "component"].includes(attribute.type)) {
      if(attribute.type === 'relation') {
        return { ...currentValue, [current]: '*' };
      }
      return currentValue;
    }
    return {
      ...currentValue,
      [current]: populateAttribute(attribute),
    };
  }, {});

  ['createdBy', 'updatedBy'].map( i => {
    Object.defineProperty(populate, i, {
      value: '*',
      enumerable: true
    })
  })
  
  return populate
};

module.exports = ({ strapi }) => ({
  exportData,
});
