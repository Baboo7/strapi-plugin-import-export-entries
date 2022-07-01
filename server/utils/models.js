'use strict';

/**
 * AttributeType.
 * @typedef {("boolean"|"component"|"datetime"|"dynamiczone"|"increments"|"number"|"relation"|"string"|"text")} AttributeType
 */

/**
 * An attribute of a model.
 * @typedef {Object} Attribute
 * @property {AttributeType} type
 * @property {string} name - Name of the attribute.
 * @property {string} [target] - Slug of the target model (if type is 'relation').
 * @property {string} [components] - Component names of the dynamic zone.
 */

/**
 * Get a model.
 * @param {string} slug
 * @return {{attributes: {[k:string]: Attribute}}}
 */
const getModel = (slug) => {
  return strapi.db.metadata.get(slug);
};

/**
 * Get the attributes of a model.
 * @param {string} slug - Slug of the model.
 * @param {AttributeType} [filterType] - Only attributes matching the type will be kept.
 * @returns {Array<Attribute>}
 */
const getModelAttributes = (slug, filterType) => {
  const attributesObj = getModel(slug).attributes;
  const attributes = Object.keys(attributesObj).reduce((acc, key) => acc.concat({ ...attributesObj[key], name: key }), []);

  if (filterType) {
    return attributes.filter((attr) => attr.type === filterType);
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
