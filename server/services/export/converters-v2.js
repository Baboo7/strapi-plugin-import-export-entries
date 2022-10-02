const fromPairs = require('lodash/fromPairs');
const pick = require('lodash/pick');
const toPairs = require('lodash/toPairs');
const { CustomSlugToSlug, CustomSlugs } = require('../../config/constants');
const { getConfig } = require('../../utils/getConfig');

const convertToJson = (jsoContent) => {
  return JSON.stringify(jsoContent, null, '\t');
};

const withBeforeConvert = (convertFn) => (jsoContent, options) => {
  jsoContent = beforeConvert(jsoContent, options);
  jsoContent = convertFn(jsoContent, options);
  return jsoContent;
};

const beforeConvert = (jsoContent, options) => {
  jsoContent = preprocess(jsoContent, options);
  jsoContent = postprocess(jsoContent, options);

  return jsoContent;
};

const preprocess = (jsoContent) => {
  let media = jsoContent.data[CustomSlugToSlug[CustomSlugs.MEDIA]];

  if (!media) {
    return jsoContent;
  }

  media = fromPairs(
    toPairs(media).map(([id, medium]) => {
      if (isRelativeUrl(medium.url)) {
        medium.url = buildAbsoluteUrl(medium.url);
      }
      return [id, medium];
    }),
  );

  jsoContent.data[CustomSlugToSlug[CustomSlugs.MEDIA]] = media;

  return jsoContent;
};

const isRelativeUrl = (url) => {
  return url.startsWith('/');
};

const buildAbsoluteUrl = (relativeUrl) => {
  return getConfig('serverPublicHostname') + relativeUrl;
};

const postprocess = (jsoContent) => {
  let mediaSlug = CustomSlugToSlug[CustomSlugs.MEDIA];
  let media = jsoContent.data[mediaSlug];

  if (!media) {
    return jsoContent;
  }

  media = fromPairs(
    toPairs(media).map(([id, medium]) => {
      medium = pick(medium, ['id', 'name', 'alternativeText', 'caption', 'hash', 'ext', 'mime', 'url', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy']);
      return [id, medium];
    }),
  );

  jsoContent.data[mediaSlug] = media;

  return jsoContent;
};

module.exports = {
  convertToJson: withBeforeConvert(convertToJson),
};
