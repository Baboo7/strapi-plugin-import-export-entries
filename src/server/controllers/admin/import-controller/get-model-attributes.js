'use strict';

const { getModelAttributes } = require('../../../utils/models');

const getModelAttributesEndpoint = async (ctx) => {
  const { slug } = ctx.params;

  const attributeNames = getModelAttributes(slug)
    .filter(filterAttribute)
    .map((attr) => attr.name);

  ctx.body = {
    data: {
      attribute_names: attributeNames,
    },
  };
};

const filterAttribute = (attr) => {
  const filters = [filterType, filterName];
  return filters.every((filter) => filter(attr));
};

const filterType = (attr) => !['relation', 'component', 'dynamiczone'].includes(attr.type);

const filterName = (attr) => !['createdAt', 'updatedAt', 'publishedAt', 'locale'].includes(attr.name);

module.exports = ({ strapi }) => getModelAttributesEndpoint;
