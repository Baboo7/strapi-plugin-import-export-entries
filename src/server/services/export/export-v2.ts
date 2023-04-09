import {
  CollectionTypeSchema as StrapiCollectionTypeSchema,
  ComponentSchema as StrapiComponentSchema,
  SingleTypeSchema as StrapiSingleTypeSchema,
  Attribute as StrapiAttribute,
  AttributeType as StrapiAttributeType,
  ComponentAttribute as StrapiComponentAttribute,
  ComponentValue as StrapiComponentValue,
  ContentTypeSchema as StrapiContentTypeSchema,
  DynamicZoneAttribute as StrapiDynamicZoneAttribute,
  DynamicZoneValue as StrapiDynamicZoneValue,
  MediaAttribute as StrapiMediaAttribute,
  RelationAttribute as StrapiRelationAttribute,
  RelationValue as StrapiRelationValue,
} from '@strapi/strapi';
import { EnumValues } from '../../../types';
const cloneDeep = require('lodash/cloneDeep');
const fromPairs = require('lodash/fromPairs');
const { isEmpty, merge } = require('lodash/fp');
const qs = require('qs');
import { isArraySafe, toArray } from '../../../libs/arrays';
import { CustomSlugToSlug, CustomSlugs } from '../../config/constants';
import { SchemaUID } from '@strapi/strapi/lib/types/utils';
import { ObjectBuilder, isObjectSafe, mergeObjects } from '../../../libs/objects';
const { getModelAttributes, getAllSlugs } = require('../../utils/models');
const { convertToJson } = require('./converters-v2');

type BaseAttribute = { name: string };
type Attribute = ComponentAttribute | DynamicZoneAttribute | MediaAttribute | RelationAttribute;
type ComponentAttribute = BaseAttribute & (StrapiComponentAttribute<'own-component', true> | StrapiComponentAttribute<'own-component', false>);
type DynamicZoneAttribute = BaseAttribute & StrapiDynamicZoneAttribute<['own-component']>;
type MediaAttribute = BaseAttribute & StrapiMediaAttribute<'audios' | 'files' | 'images' | 'videos'>;
type RelationAttribute = BaseAttribute &
  (
    | StrapiRelationAttribute<'own-collection-type' | 'own-single-type', 'oneToOne'>
    | StrapiRelationAttribute<'own-collection-type' | 'own-single-type', 'oneToMany'>
    | StrapiRelationAttribute<'own-collection-type' | 'own-single-type', 'manyToOne'>
    | StrapiRelationAttribute<'own-collection-type' | 'own-single-type', 'manyToMany'>
  );
// TODO: filter out polymorphic relations
// | StrapiRelationAttribute<'own-collection-type' | 'own-single-type', 'morphOne'>
// | StrapiRelationAttribute<'own-collection-type' | 'own-single-type', 'morphMany'>
// | StrapiRelationAttribute<'own-collection-type' | 'own-single-type', 'morphToOne'>
// | StrapiRelationAttribute<'own-collection-type' | 'own-single-type', 'morphToMany'>

// Media are not included in type because equals any atm.
type Entry = ComponentEntry | DynamicZoneEntry | RelationEntry;
type ComponentEntry = (WithI18n<StrapiComponentValue<'own-component', true>> & EntryBase) | (WithI18n<StrapiComponentValue<'own-component', false>> & EntryBase);
type DynamicZoneEntry = WithI18n<UnwrapArray<StrapiDynamicZoneValue<['own-component']>>> & EntryBase;
type RelationEntry =
  | (WithI18n<StrapiRelationValue<'oneToOne', 'own-collection-type' | 'own-single-type'>> & EntryBase)
  | (WithI18n<StrapiRelationValue<'oneToMany', 'own-collection-type' | 'own-single-type'>> & EntryBase)
  | (WithI18n<StrapiRelationValue<'manyToOne', 'own-collection-type' | 'own-single-type'>> & EntryBase)
  | (WithI18n<StrapiRelationValue<'manyToMany', 'own-collection-type' | 'own-single-type'>> & EntryBase);
// TODO: filter out polymorphic relations
// | (WithI18n<StrapiRelationValue<'morphOne', 'own-collection-type' | 'own-single-type'>> & EntryBase)
// | (WithI18n<StrapiRelationValue<'morphMany', 'own-collection-type' | 'own-single-type'>> & EntryBase)
// | (WithI18n<StrapiRelationValue<'morphToOne', 'own-collection-type' | 'own-single-type'>> & EntryBase)
// | (WithI18n<StrapiRelationValue<'morphToMany', 'own-collection-type' | 'own-single-type'>> & EntryBase);
type EntryBase = { id: EntryId };
type EntryId = number | string;
type WithI18n<T> = UnwrapArray<T> & {
  localizations?: UnwrapArray<T>[];
  locale?: string;
};
type UnwrapArray<T> = T extends Array<infer U> ? U : T;

type Schema = CollectionTypeSchema | SingleTypeSchema | ComponentSchema;
type CollectionTypeSchema = StrapiCollectionTypeSchema & SchemaPluginOptions;
type SingleTypeSchema = StrapiSingleTypeSchema & SchemaPluginOptions;
type ComponentSchema = StrapiComponentSchema & { uid: SchemaUID } & SchemaPluginOptions;
type SchemaPluginOptions = {
  pluginOptions?: {
    'content-manager'?: {
      visible?: boolean;
    };
    'content-type-builder'?: {
      visible?: boolean;
    };
    i18n?: {
      localized?: true;
    };
  };
};

const getSchema = (slug: SchemaUID): Schema => strapi.getModel(slug);
const getEntryProp = (entry: Entry, prop: string): any => {
  return (entry as any)[prop];
};
const setEntryProp = (entry: Entry, prop: string, value: any): void => {
  (entry as any)[prop] = value;
};
const deleteEntryProp = (entry: Entry, prop: string): void => {
  delete (entry as any)[prop];
};

const dataFormats = {
  JSON: 'json',
} as const;

const dataConverterConfigs = {
  [dataFormats.JSON]: {
    convertEntries: convertToJson,
  },
};

type Export = {
  version: 2;
  data: ExportData;
};
type ExportData = ExportDataSlugEntries;
type ExportDataSlugEntries = {
  [slug in SchemaUID]?: {
    [key: string]: {
      [attribute: string]: string | number | string[] | number[] | null;
    };
  };
};
/**
 * Export data.
 */
const exportDataV2 = async ({ slug, search, applySearch, deepness = 5 }: { slug: SchemaUID; search: string; applySearch: boolean; deepness: number }): Promise<string> => {
  const slugsToExport: SchemaUID[] = slug === CustomSlugs.WHOLE_DB ? getAllSlugs() : toArray(CustomSlugToSlug[slug] || slug);

  let entries: ExportData = {};
  for (const slug of slugsToExport) {
    const hierarchy = buildSlugHierarchy(slug, deepness);
    const slugEntries = await findEntriesForHierarchy(slug, hierarchy, deepness, { ...(applySearch ? { search } : {}) });
    entries = mergeObjects(entries, slugEntries);
  }
  const jsoContent: Export = {
    version: 2,
    data: entries,
  };
  const fileContent = convertData(jsoContent, {
    slug,
    dataFormat: 'json',
  });
  return fileContent;
};

const findEntriesForHierarchy = async (
  slug: SchemaUID,
  hierarchy: Hierarchy,
  deepness: number,
  { search, ids }: { search?: string; ids?: EntryId[] },
): Promise<ExportDataSlugEntries> => {
  const schema = getSchema(slug);

  if (schema.uid === 'admin::user') {
    return {};
  }

  let storedData: ExportDataSlugEntries = {};

  let entries = await findEntries(slug, deepness, { search, ids })
    .then((entries: Entry[]) => {
      entries = toArray(entries).filter(Boolean);

      // Export locales
      if (schema.pluginOptions?.i18n?.localized) {
        const allEntries = [...entries];
        const entryIdsToExported = fromPairs(allEntries.map((entry) => [entry.id, true]));

        for (const entry of entries) {
          (entry.localizations || []).forEach((localization) => {
            if (!entryIdsToExported[localization.id]) {
              allEntries.push(localization);
              entryIdsToExported[localization.id] = true;
            }
          });
        }

        return allEntries;
      }

      return entries;
    })
    .then((entries) => toArray(entries));

  // Transform relations as ids.
  let entriesFlatten: Entry[] = cloneDeep(entries);
  (() => {
    const flattenEntryCommon = (entry: Exclude<Entry, DynamicZoneEntry> | Exclude<Entry, DynamicZoneEntry>[]) => {
      if (entry == null) {
        return null;
      } else if (isArraySafe(entry)) {
        return entry.map((rel) => {
          if (isObjectSafe(rel)) {
            return rel.id;
          }
          return rel;
        });
      } else if (isObjectSafe(entry)) {
        return entry.id;
      }
      return entry;
    };

    const flattenProperty = (propAttribute: Attribute, propEntries: Entry | Entry[]) => {
      if (propEntries == null) {
        return null;
      } else if (isComponentAttribute(propAttribute)) {
        return flattenEntryCommon(propEntries);
      } else if (isDynamicZoneAttribute(propAttribute)) {
        return (propEntries as DynamicZoneEntry[]).map((entry) => ({
          __component: entry.__component,
          id: entry.id,
        }));
      } else if (isMediaAttribute(propAttribute)) {
        return flattenEntryCommon(propEntries);
      } else if (isRelationAttribute(propAttribute)) {
        return flattenEntryCommon(propEntries);
      }
      return propEntries;
    };

    const flattenEntry = (entry: Entry, slug: SchemaUID) => {
      const attributes: Attribute[] = getModelAttributes(slug, { filterType: ['component', 'dynamiczone', 'media', 'relation'] });

      for (const attribute of attributes) {
        setEntryProp(entry, attribute.name, flattenProperty(attribute, getEntryProp(entry, attribute.name)));
      }

      return entry;
    };

    entriesFlatten = entriesFlatten.map((entry) => flattenEntry(entry, slug));
  })();

  storedData = mergeObjects({ [slug]: Object.fromEntries(entriesFlatten.map((entry) => [entry.id, entry])) }, storedData);

  // Skip admin::user slug.
  const filterOutUnwantedRelations = () => {
    const UNWANTED_RELATIONS: SchemaUID[] = ['admin::user'];
    const attributes: RelationAttribute[] = getModelAttributes(slug, { filterType: ['relation'] });

    return entries.map((entry) => {
      attributes.forEach((attribute) => {
        if (UNWANTED_RELATIONS.includes(attribute.target)) {
          deleteEntryProp(entry, attribute.name);
        }
      });
      return entry;
    });
  };
  filterOutUnwantedRelations();

  const findAndFlattenComponentAttributes = async () => {
    let attributes: ComponentAttribute[] = getModelAttributes(slug, { filterType: ['component'] });
    for (const attribute of attributes) {
      if (!hierarchy[attribute.name]?.__slug) {
        continue;
      }

      const ids: EntryId[] = entries
        .filter((entry) => !!getEntryProp(entry, attribute.name))
        .flatMap((entry) => getEntryProp(entry, attribute.name) as ComponentEntry | ComponentEntry[])
        .filter((entry) => !!entry.id)
        .map((entry) => entry.id);

      const dataToStore = await findEntriesForHierarchy(hierarchy[attribute.name].__slug, hierarchy[attribute.name], deepness - 1, { ids });
      storedData = mergeObjects(dataToStore, storedData);
    }
  };
  await findAndFlattenComponentAttributes();

  const findAndFlattenDynamicZoneAttributes = async () => {
    let attributes: DynamicZoneAttribute[] = getModelAttributes(slug, { filterType: ['dynamiczone'] });
    for (const attribute of attributes) {
      for (const componentSlug of attribute.components) {
        const componentHierarchy = hierarchy[attribute.name]?.[componentSlug];
        if (!componentHierarchy?.__slug) {
          continue;
        }

        const ids = entries
          .filter((entry) => !!getEntryProp(entry, attribute.name))
          .flatMap((entry) => getEntryProp(entry, attribute.name))
          .filter((entry: DynamicZoneEntry) => entry?.__component === componentSlug)
          .map((entry) => entry.id);

        const dataToStore = await findEntriesForHierarchy(componentHierarchy.__slug, componentHierarchy, deepness - 1, { ids });
        storedData = mergeObjects(dataToStore, storedData);
      }
    }
  };
  await findAndFlattenDynamicZoneAttributes();

  const findAndFlattenMediaAttributes = async () => {
    let attributes: MediaAttribute[] = getModelAttributes(slug, { filterType: ['media'] });
    for (const attribute of attributes) {
      if (!hierarchy[attribute.name]?.__slug) {
        continue;
      }

      const ids = entries
        .filter((entry) => !!getEntryProp(entry, attribute.name))
        .flatMap((entry) => getEntryProp(entry, attribute.name))
        .filter((entry) => !!entry.id)
        .map((entry) => entry.id);

      const dataToStore = await findEntriesForHierarchy(hierarchy[attribute.name].__slug, hierarchy[attribute.name], deepness - 1, { ids });
      storedData = mergeObjects(dataToStore, storedData);
    }
  };
  await findAndFlattenMediaAttributes();

  const findAndFlattenRelationAttributes = async () => {
    let attributes = getModelAttributes(slug, { filterType: ['relation'] });
    for (const attribute of attributes) {
      if (!hierarchy[attribute.name]?.__slug) {
        continue;
      }

      const ids = entries
        .filter((entry) => !!getEntryProp(entry, attribute.name))
        .flatMap((entry) => getEntryProp(entry, attribute.name))
        .filter((entry) => !!entry.id)
        .map((entry) => entry.id);

      const dataToStore = await findEntriesForHierarchy(hierarchy[attribute.name].__slug, hierarchy[attribute.name], deepness - 1, { ids });
      storedData = mergeObjects(dataToStore, storedData);
    }
  };
  await findAndFlattenRelationAttributes();

  return storedData;
};

const findEntries = async (slug: string, deepness: number, { search, ids }: { search?: string; ids?: EntryId[] }) => {
  try {
    const queryBuilder = new ObjectBuilder();
    queryBuilder.extend(getPopulateFromSchema(slug, deepness));
    if (search) {
      queryBuilder.extend(buildFilterQuery(search));
    } else if (ids) {
      queryBuilder.extend({
        filters: {
          id: { $in: ids },
        },
      });
    }

    const entries = await strapi.entityService.findMany(slug, queryBuilder.get());

    return entries;
  } catch (_) {
    return [];
  }
};

const buildFilterQuery = (search = '') => {
  let { filters, sort: sortRaw } = qs.parse(search);

  const [attr, value] = sortRaw?.split(':') || [];
  const sort: Record<string, string> = {};
  if (attr && value) {
    sort[attr] = value.toLowerCase();
  }

  return {
    filters,
    sort,
  };
};

/**
 *
 * @param {Object} data
 * @param {Array<Object>} data.entries
 * @param {Record<string, any>} data.hierarchy
 * @param {Object} options
 * @param {string} options.slug
 * @param {string} options.dataFormat
 * @param {boolean} options.relationsAsId
 * @returns
 */
const convertData = (data: any, options: any) => {
  const converter = getConverter(options.dataFormat);

  const convertedData = converter.convertEntries(data, options);

  return convertedData;
};

const getConverter = (dataFormat: EnumValues<typeof dataFormats>) => {
  const converter = dataConverterConfigs[dataFormat];

  if (!converter) {
    throw new Error(`Data format ${dataFormat} is not supported.`);
  }

  return converter;
};

type Populate = { populate: Record<string, Populate | true | undefined> };

const getPopulateFromSchema = (slug: string, deepness = 5): Populate | true | undefined => {
  if (deepness <= 1) {
    return true;
  }

  if (slug === 'admin::user') {
    return undefined;
  }

  const populate: Record<string, any> = {};
  const model = strapi.getModel(slug);
  for (const [attributeName, attribute] of Object.entries(getModelPopulationAttributes(model))) {
    if (!attribute) {
      continue;
    }

    if (isComponentAttribute(attribute)) {
      populate[attributeName] = getPopulateFromSchema(attribute.component, deepness - 1);
    } else if (isDynamicZoneAttribute(attribute)) {
      const dynamicPopulate = attribute.components.reduce((zonePopulate, component) => {
        const compPopulate = getPopulateFromSchema(component, deepness - 1);
        return compPopulate === true ? zonePopulate : merge(zonePopulate, compPopulate);
      }, {});
      populate[attributeName] = isEmpty(dynamicPopulate) ? true : dynamicPopulate;
    } else if (isRelationAttribute(attribute)) {
      const relationPopulate = getPopulateFromSchema(attribute.target, deepness - 1);
      if (relationPopulate) {
        populate[attributeName] = relationPopulate;
      }
    } else if (isMediaAttribute(attribute)) {
      populate[attributeName] = true;
    }
  }

  return isEmpty(populate) ? true : { populate };
};

// TODO
type Hierarchy = any;
// type Hierarchy = {
//   [key: string]: Hierarchy | string;
// };

const buildSlugHierarchy = (slug: string, deepness = 5): Hierarchy => {
  slug = CustomSlugToSlug[slug] || slug;

  if (deepness <= 1) {
    return { __slug: slug };
  }

  const hierarchy: Hierarchy = {
    __slug: slug,
  };

  const model: StrapiContentTypeSchema = strapi.getModel(slug);
  for (const [attributeName, attribute] of Object.entries(getModelPopulationAttributes(model)) as [string, StrapiAttribute][]) {
    if (!attribute) {
      continue;
    }

    if (isComponentAttribute(attribute)) {
      hierarchy[attributeName] = buildSlugHierarchy(attribute.component, deepness - 1);
    } else if (isDynamicZoneAttribute(attribute)) {
      hierarchy[attributeName] = Object.fromEntries(attribute.components.map((componentSlug) => [componentSlug, buildSlugHierarchy(componentSlug, deepness - 1)]));
    } else if (isRelationAttribute(attribute)) {
      const relationHierarchy = buildSlugHierarchy(attribute.target, deepness - 1);
      if (relationHierarchy) {
        hierarchy[attributeName] = relationHierarchy;
      }
    } else if (isMediaAttribute(attribute)) {
      hierarchy[attributeName] = buildSlugHierarchy(CustomSlugs.MEDIA, deepness - 1);
    }
  }

  return hierarchy;
};

const isComponentAttribute = (attribute: any): attribute is ComponentAttribute => {
  return (attribute as { type: StrapiAttributeType }).type === 'component';
};

const isDynamicZoneAttribute = (attribute: any): attribute is DynamicZoneAttribute => {
  return (attribute as { type: StrapiAttributeType }).type === 'dynamiczone';
};

const isMediaAttribute = (attribute: any): attribute is MediaAttribute => {
  return (attribute as { type: StrapiAttributeType }).type === 'media';
};

const isRelationAttribute = (attribute: any): attribute is RelationAttribute => {
  return (attribute as { type: StrapiAttributeType }).type === 'relation';
};

const getModelPopulationAttributes = (model: StrapiContentTypeSchema) => {
  if (model.uid === 'plugin::upload.file') {
    const { related, ...attributes } = model.attributes;
    return attributes;
  }

  return model.attributes;
};

module.exports = {
  exportDataV2,
};
