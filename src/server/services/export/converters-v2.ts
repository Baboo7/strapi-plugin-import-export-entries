import { SchemaUID } from '@strapi/strapi/lib/types/utils';
import { fromPairs, pick, toPairs } from 'lodash';
import { CustomSlugToSlug, CustomSlugs } from '../../config/constants';
import { Export, ExportOptions } from './export-v2';
const { getConfig } = require('../../utils/getConfig');

type Converter = (jsoContent: Export, options: ExportOptions) => string;

export default {
  convertToJson: withBeforeConvert(convertToJson),
};

function convertToJson(jsoContent: Export) {
  return JSON.stringify(jsoContent, null, '\t');
}

function withBeforeConvert(convertFn: Converter) {
  return (jsoContent: Export, options: ExportOptions) => {
    return convertFn(beforeConvert(jsoContent, options), options);
  };
}

function beforeConvert(jsoContent: Export, options: ExportOptions) {
  jsoContent = buildMediaUrl(jsoContent, options);
  jsoContent = pickMediaAttributes(jsoContent, options);

  return jsoContent;
}

function buildMediaUrl(jsoContent: Export, options: ExportOptions) {
  let mediaSlug: SchemaUID = CustomSlugToSlug[CustomSlugs.MEDIA];
  let media = jsoContent.data[mediaSlug];

  if (!media) {
    return jsoContent;
  }

  media = fromPairs(
    toPairs(media).map(([id, medium]: [string, any]) => {
      if (isRelativeUrl(medium.url)) {
        medium.url = buildAbsoluteUrl(medium.url);
      }
      return [id, medium];
    }),
  );

  jsoContent.data[mediaSlug] = media;

  return jsoContent;
}

function isRelativeUrl(url: string) {
  return url.startsWith('/');
}

function buildAbsoluteUrl(relativeUrl: string) {
  return getConfig('serverPublicHostname') + relativeUrl;
}

function pickMediaAttributes(jsoContent: Export, options: ExportOptions) {
  let mediaSlug: SchemaUID = CustomSlugToSlug[CustomSlugs.MEDIA];
  let media = jsoContent.data[mediaSlug];

  if (!media) {
    return jsoContent;
  }

  media = fromPairs(
    toPairs(media).map(([id, medium]: [string, any]) => {
      medium = pick(medium, ['id', 'name', 'alternativeText', 'caption', 'hash', 'ext', 'mime', 'url', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy']);
      return [id, medium];
    }),
  );

  jsoContent.data[mediaSlug] = media;

  return jsoContent;
}
