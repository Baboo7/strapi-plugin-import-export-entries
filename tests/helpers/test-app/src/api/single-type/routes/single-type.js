'use strict';

/**
 * single-type router.
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::single-type.single-type');
