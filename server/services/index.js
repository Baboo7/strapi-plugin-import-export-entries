"use strict";

const { Services } = require("../utils");
const dataConverter = require("./data-converter");

module.exports = {
  [Services.DATA_CONVERTER]: dataConverter,
};
