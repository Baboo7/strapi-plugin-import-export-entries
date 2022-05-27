"use strict";

const csvtojson = require("csvtojson");
const isEmpty = require("lodash/isEmpty");

const importData = async (ctx) => {
  const { slug, data: dataRaw, format } = ctx.request.body;

  let data;
  if (format === "csv") {
    data = await csvtojson().fromString(dataRaw);
  } else if (format === "json") {
    data = JSON.parse(dataRaw);
  }

  const processed = await Promise.all(data.map(updateOrCreateFlow(slug)));

  const failures = processed
    .filter((p) => !p.success)
    .map((f) => ({ error: f.error, data: f.args[0] }));

  ctx.body = {
    failures,
  };
};

const updateOrCreateFlow = (slug) => async (d) => {
  const res = await catchError((d) => updateOrCreate(slug, d), d);
  return res;
};

const updateOrCreate = async (slug, data) => {
  const where = {};
  if (data.id) {
    where.id = data.id;
  }

  let entry;
  if (isEmpty(where)) {
    entry = await strapi.db.query(slug).create({
      data,
    });
  } else {
    entry = await strapi.db.query(slug).update({
      where,
      data,
    });
  }
};

const catchError = async (fn, ...args) => {
  try {
    await fn(...args);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message, args };
  }
};

module.exports = ({ strapi }) => ({
  importData,
});
