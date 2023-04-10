import { SchemaUID } from '@strapi/strapi/lib/types/utils';

export const CustomSlugs = {
  MEDIA: 'media',
  WHOLE_DB: 'custom:db',
};

export const CustomSlugToSlug = {
  [CustomSlugs.MEDIA]: 'plugin::upload.file',
} as const;

export const isCustomSlug = (slug: SchemaUID): boolean => {
  return !!CustomSlugToSlug[slug];
};

module.exports = {
  CustomSlugs,
  CustomSlugToSlug,
  isCustomSlug,
};
