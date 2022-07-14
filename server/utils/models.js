'use strict';

/**
 * AttributeType.
 * @typedef {("boolean"|"component"|"datetime"|"dynamiczone"|"increments"|"media"|"number"|"relation"|"string"|"text")} AttributeType
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
 * Get the attributes of a model.
 * @param {string} slug - Slug of the model.
 * @param {AttributeType | Array<AttributeType>} [filterType] - Only attributes matching the type(s) will be kept.
 * @returns {Array<Attribute>}
 */
const getModelAttributes = (slug, filterType) => {
  const typesToKeep = filterType ? (Array.isArray(filterType) ? filterType : [filterType]) : [];

  const attributesObj = strapi.getModel(slug).attributes;
  const attributes = Object.keys(attributesObj).reduce((acc, key) => acc.concat({ ...attributesObj[key], name: key }), []);

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
  getModelAttributes,
  isAttributeDynamicZone,
};
