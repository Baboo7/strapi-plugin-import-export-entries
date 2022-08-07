'use strict';

const { toArray } = require('../../libs/arrays');

/**
 * ModelKind.
 * @typedef {("collectionType"|"singleType")} ModelKind
 */

/**
 * A model.
 * @typedef {Object} Model
 * @property {ModelKind} kind
 * @property {{[k: string]: Attribute}} attributes - Name of the attribute.
 */

/**
 * AttributeType.
 * @typedef {("boolean"|"component"|"datetime"|"dynamiczone"|"increments"|"media"|"number"|"relation"|"string"|"text")} AttributeType
 */

/**
 * AttributeTarget.
 * @typedef {("admin::user")} AttributeTarget
 */

/**
 * An attribute of a model.
 * @typedef {Object} Attribute
 * @property {AttributeType} type
 * @property {string} name - Name of the attribute.
 * @property {string} [target] - Slug of the target model (if type is 'relation').
 * @property {string} [component] - Name of the targetted component.
 * @property {boolean} [repeatable] - Whether the component is repeatable.
 * @property {string} [components] - Component names of the dynamic zone.
 * @property {("audios"|"files"|"images"|"videos")} [allowedTypes] - Allowed file types.
 * @property {boolean} [multiple] - Whether there are multiple files.
 */

/**
 * Get a model.
 * @param {string} slug - Slug of the model.
 * @returns {Model}
 */
const getModel = (slug) => {
  return strapi.getModel(slug);
};

/**
 * Get the attributes of a model.
 * @param {string} slug - Slug of the model.
 * @param {Object} options
 * @param {AttributeType | Array<AttributeType>} [options.filterType] - Only attributes matching the type(s) will be kept.
 * @param {AttributeTarget | Array<AttributeTarget>} [options.filterOutTarget] - Remove attributes matching the specified target(s).
 * @returns {Array<Attribute>}
 */
const getModelAttributes = (slug, options = {}) => {
  const typesToKeep = options.filterType ? (Array.isArray(options.filterType) ? options.filterType : [options.filterType]) : [];
  const filterOutTarget = toArray(options.filterOutTarget || []);

  const attributesObj = strapi.getModel(slug).attributes;
  const attributes = Object.keys(attributesObj)
    .reduce((acc, key) => acc.concat({ ...attributesObj[key], name: key }), [])
    .filter((attr) => !filterOutTarget.includes(attr.target));

  if (typesToKeep.length) {
    return attributes.filter((attr) => typesToKeep.includes(attr.type));
  }

  return attributes;
};

/**
 * Indicate whether an attribute is a dynamic zone.
 * @param {Attribute} attribute
 * @returns {boolean}
 */
const isAttributeDynamicZone = (attribute) => {
  return attribute.components && Array.isArray(attribute.components);
};

module.exports = {
  getModel,
  getModelAttributes,
  isAttributeDynamicZone,
};
