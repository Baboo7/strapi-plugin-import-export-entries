'use strict';

/**
 * single-type service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::single-type.single-type');
