'use strict';

/**
 *  single-type controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::single-type.single-type');
