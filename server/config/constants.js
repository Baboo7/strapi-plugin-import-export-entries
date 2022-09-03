const CustomSlugs = {
  MEDIA: 'media',
};

CustomSlugToSlug = {
  [CustomSlugs.MEDIA]: 'plugin::upload.file',
};

module.exports = {
  CustomSlugs,
  CustomSlugToSlug,
};
