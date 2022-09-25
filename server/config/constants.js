const CustomSlugs = {
  MEDIA: 'media',
};

const CustomSlugToSlug = {
  [CustomSlugs.MEDIA]: 'plugin::upload.file',
};

const isCustomSlug = (slug) => {
  return !!CustomSlugToSlug[slug];
};

module.exports = {
  CustomSlugs,
  CustomSlugToSlug,
  isCustomSlug,
};
