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
 * @property {string} collectionName
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
 * @property {Array<string>} [components] - Component names of the dynamic zone.
 * @property {("audios"|"files"|"images"|"videos")} [allowedTypes] - Allowed file types.
 * @property {boolean} [multiple] - Whether there are multiple files.
 */

const getAllSlugs = () => {
  return Array.from(strapi.db.metadata)
    .map(([collectionName]) => collectionName)
    .filter((collectionName) => collectionName.startsWith('api::'));
};

/**
 * Get a model.
 * @param {string} slug - Slug of the model.
 * @returns {Model}
 */
const getModel = (slug) => {
  return strapi.getModel(slug);
};

const getModelConfig = (modelOrSlug) => {
  const model = getModelFromSlugOrModel(modelOrSlug);

  return {
    kind: model.kind === 'singleType' ? 'single' : 'collection',
    isLocalized: !!model.pluginOptions?.i18n?.localized,
  };
};

const getModelFromSlugOrModel = (modelOrSlug) => {
  let model = modelOrSlug;
  if (typeof model === 'string') {
    model = getModel(modelOrSlug);
  }

  return model;
};

/**
 * Get the attributes of a model.
 * @param {string} slug - Slug of the model.
 * @param {Object} options
 * @param {AttributeType | Array<AttributeType>} [options.filterType] - Only attributes matching the type(s) will be kept.
 * @param {AttributeType | Array<AttributeType>} [options.filterOutType] - Remove attributes matching the specified type(s).
 * @param {AttributeTarget | Array<AttributeTarget>} [options.filterOutTarget] - Remove attributes matching the specified target(s).
 * @param {boolean} [options.addIdAttribute] - Add `id` in the returned attributes.
 * @returns {Array<Attribute>}
 */
const getModelAttributes = (slug, options = {}) => {
  const typesToKeep = options.filterType ? toArray(options.filterType) : [];
  const typesToFilterOut = options.filterOutType ? toArray(options.filterOutType) : [];
  const filterOutTarget = toArray(options.filterOutTarget || []);

  const attributesObj = strapi.getModel(slug).attributes;
  let attributes = Object.keys(attributesObj)
    .reduce((acc, key) => acc.concat({ ...attributesObj[key], name: key }), [])
    .filter((attr) => !typesToFilterOut.includes(attr.type))
    .filter((attr) => !filterOutTarget.includes(attr.target));

  if (typesToKeep.length) {
    attributes = attributes.filter((attr) => typesToKeep.includes(attr.type));
  }

  if (options.addIdAttribute) {
    attributes.unshift({ name: 'id' });
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
  getAllSlugs,
  getModel,
  getModelConfig,
  getModelAttributes,
  isAttributeDynamicZone,
};
