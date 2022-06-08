"use strict";

const { ObjectBuilder } = require("../../../libs/objects");
const { catchError } = require("../../utils");
const { getModelAttributes } = require("../../utils/models");
const { parseInputData } = require("./utils/parsers");

const importData = async (ctx) => {
  if (!hasPermissions(ctx)) {
    return ctx.forbidden();
  }

  const { user } = ctx.state;
  const { slug, data: dataRaw, format } = ctx.request.body;

  const data = await parseInputData(format, dataRaw, { slug });

  const processed = [];
  for (let datum of data) {
    const res = await catchError(
      (datum) => updateOrCreate(user, slug, datum),
      datum
    );
    processed.push(res);
  }

  const failures = processed
    .filter((p) => !p.success)
    .map((f) => ({ error: f.error, data: f.args[0] }));

  ctx.body = {
    failures,
  };
};

const hasPermissions = (ctx) => {
  let { slug } = ctx.request.body;
  const { userAbility } = ctx.state;

  const permissionChecker = strapi
    .plugin("content-manager")
    .service("permission-checker")
    .create({ userAbility, model: slug });

  return permissionChecker.can.create() && permissionChecker.can.update();
};

const updateOrCreate = async (user, slug, data) => {
  const relations = getModelAttributes(slug, "relation");
  const processingRelations = relations.map((rel) =>
    updateOrCreateRelation(user, data, rel)
  );
  await Promise.all(processingRelations);

  const whereBuilder = new ObjectBuilder();
  if (data.id) {
    whereBuilder.extend({ id: data.id });
  }
  const where = whereBuilder.get();

  let entry;
  if (!where.id) {
    entry = await strapi.db.query(slug).create({ data });
  } else {
    entry = await strapi.db.query(slug).update({ where, data });

    if (!entry) {
      entry = await strapi.db.query(slug).create({ data });
    }
  }

  return entry;
};

const updateOrCreateRelation = async (user, data, rel) => {
  const relName = rel.name;
  if (["createdBy", "updatedBy"].includes(relName)) {
    data[relName] = user.id;
  }
  // data[relName] has to be checked since typeof null === "object".
  else if (data[relName] && Array.isArray(data[relName])) {
    const entries = await Promise.all(
      data[relName].map((relData) => updateOrCreate(user, rel.target, relData))
    );
    data[relName] = entries.map((entry) => entry.id);
  }
  // data[relName] has to be checked since typeof null === "object".
  else if (data[relName] && typeof data[relName] === "object") {
    const entry = await updateOrCreate(user, rel.target, data[relName]);
    data[relName] = entry?.id || null;
  }
};

module.exports = ({ strapi }) => ({
  importData,
});
