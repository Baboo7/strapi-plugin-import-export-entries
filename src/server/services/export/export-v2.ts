import { Attribute, ComponentAttribute, ComponentEntry, DynamicZoneAttribute, DynamicZoneEntry, Entry, EntryId, MediaAttribute, RelationAttribute, Schema } from '../../types';
import cloneDeep from 'lodash/cloneDeep';
import fromPairs from 'lodash/fromPairs';
import { isEmpty, merge } from 'lodash/fp';
import qs from 'qs';
import { isArraySafe, toArray } from '../../../libs/arrays';
import { CustomSlugToSlug, CustomSlugs } from '../../config/constants';
import { SchemaUID } from '@strapi/strapi/lib/types/utils';
import { ObjectBuilder, isObjectSafe, mergeObjects } from '../../../libs/objects';
import { EnumValues } from '../../../types';
import {
  getModelAttributes,
  getAllSlugs,
  isComponentAttribute,
  isDynamicZoneAttribute,
  isMediaAttribute,
  isRelationAttribute,
  getModel,
  deleteEntryProp,
  setEntryProp,
  getEntryProp,
} from '../../utils/models';
import converters from './converters-v2';

const dataFormats = {
  JSON: 'json',
} as const;

const dataConverterConfigs = {
  [dataFormats.JSON]: {
    convertEntries: converters.convertToJson,
  },
};

export type Export = {
  version: 2;
  data: ExportData;
};
type ExportData = ExportDataStore;
type ExportDataStore = {
  [slug in SchemaUID]?: {
    [key: string]: {
      [attribute: string]: string | number | string[] | number[] | null;
    };
  };
};
export type ExportOptions = { dataFormat: EnumValues<typeof dataFormats> };

module.exports = {
  exportDataV2,
};

/**
 * Export data.
 */
async function exportDataV2({
  slug,
  search,
  applySearch,
  deepness = 5,
  exportPluginsContentTypes,
}: {
  slug: SchemaUID;
  search: string;
  applySearch: boolean;
  deepness: number;
  exportPluginsContentTypes: boolean;
}): Promise<string> {
  const slugsToExport: SchemaUID[] =
    slug === CustomSlugs.WHOLE_DB ? getAllSlugs({ includePluginsContentTypes: exportPluginsContentTypes }) : toArray(CustomSlugToSlug[slug] || slug);

  let store: ExportDataStore = {};
  for (const slug of slugsToExport) {
    const hierarchy = buildSlugHierarchy(slug, deepness);
    store = await findEntriesForHierarchy(store, slug, hierarchy, deepness, { ...(applySearch ? { search } : {}) });
  }
  const jsoContent: Export = {
    version: 2,
    data: store,
  };
  const fileContent = convertData(jsoContent, {
    dataFormat: 'json',
  });
  return fileContent;
}

async function findEntriesForHierarchy(
  store: ExportDataStore,
  slug: SchemaUID,
  hierarchy: Hierarchy,
  deepness: number,
  { search, ids }: { search?: string; ids?: EntryId[] },
): Promise<ExportDataStore> {
  const schema = getModel(slug);

  if (schema.uid === 'admin::user') {
    return {};
  }

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
      const attributes: Attribute[] = getModelAttributes(slug, { filterType: ['component', 'dynamiczone', 'media', 'relation'] }) as Attribute[];

      for (const attribute of attributes) {
        setEntryProp(entry, attribute.name, flattenProperty(attribute, getEntryProp(entry, attribute.name)));
      }

      return entry;
    };

    entriesFlatten = entriesFlatten.map((entry) => flattenEntry(entry, slug));
  })();

  store = mergeObjects({ [slug]: Object.fromEntries(entriesFlatten.map((entry) => [entry.id, entry])) }, store);

  // Skip admin::user slug.
  const filterOutUnwantedRelations = () => {
    const UNWANTED_RELATIONS: SchemaUID[] = ['admin::user'];
    const attributes: RelationAttribute[] = getModelAttributes(slug, { filterType: ['relation'] }) as RelationAttribute[];

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
    let attributes: ComponentAttribute[] = getModelAttributes(slug, { filterType: ['component'] }) as ComponentAttribute[];
    for (const attribute of attributes) {
      const attributeSlug: SchemaUID | undefined = hierarchy[attribute.name]?.__slug;
      if (!attributeSlug) {
        continue;
      }

      const ids: EntryId[] = entries
        .filter((entry) => !!getEntryProp(entry, attribute.name))
        .flatMap((entry) => getEntryProp(entry, attribute.name) as ComponentEntry | ComponentEntry[])
        .filter((entry) => !!entry.id)
        .map((entry) => entry.id)
        .filter((id) => typeof store?.[attributeSlug]?.[`${id}`] === 'undefined');

      const dataToStore = await findEntriesForHierarchy(store, attributeSlug, hierarchy[attribute.name], deepness - 1, { ids });
      store = mergeObjects(dataToStore, store);
    }
  };
  await findAndFlattenComponentAttributes();

  const findAndFlattenDynamicZoneAttributes = async () => {
    let attributes: DynamicZoneAttribute[] = getModelAttributes(slug, { filterType: ['dynamiczone'] }) as DynamicZoneAttribute[];
    for (const attribute of attributes) {
      for (const slugFromAttribute of attribute.components) {
        const componentHierarchy = hierarchy[attribute.name]?.[slugFromAttribute];
        const componentSlug: SchemaUID | undefined = componentHierarchy?.__slug;
        if (!componentSlug) {
          continue;
        }

        const ids = entries
          .filter((entry) => !!getEntryProp(entry, attribute.name))
          .flatMap((entry) => getEntryProp(entry, attribute.name))
          .filter((entry: DynamicZoneEntry) => entry?.__component === slugFromAttribute)
          .map((entry) => entry.id)
          .filter((id) => typeof store?.[componentSlug]?.[`${id}`] === 'undefined');

        const dataToStore = await findEntriesForHierarchy(store, componentSlug, componentHierarchy, deepness - 1, { ids });
        store = mergeObjects(dataToStore, store);
      }
    }
  };
  await findAndFlattenDynamicZoneAttributes();

  const findAndFlattenMediaAttributes = async () => {
    let attributes: MediaAttribute[] = getModelAttributes(slug, { filterType: ['media'] }) as MediaAttribute[];
    for (const attribute of attributes) {
      const attributeSlug: SchemaUID | undefined = hierarchy[attribute.name]?.__slug;
      if (!attributeSlug) {
        continue;
      }

      const ids = entries
        .filter((entry) => !!getEntryProp(entry, attribute.name))
        .flatMap((entry) => getEntryProp(entry, attribute.name))
        .filter((entry) => !!entry.id)
        .map((entry) => entry.id)
        .filter((id) => typeof store?.[attributeSlug]?.[`${id}`] === 'undefined');

      const dataToStore = await findEntriesForHierarchy(store, attributeSlug, hierarchy[attribute.name], deepness - 1, { ids });
      store = mergeObjects(dataToStore, store);
    }
  };
  await findAndFlattenMediaAttributes();

  const findAndFlattenRelationAttributes = async () => {
    let attributes: RelationAttribute[] = getModelAttributes(slug, { filterType: ['relation'] }) as RelationAttribute[];
    for (const attribute of attributes) {
      const attributeSlug: SchemaUID | undefined = hierarchy[attribute.name]?.__slug;
      if (!attributeSlug) {
        continue;
      }

      const ids = entries
        .filter((entry) => !!getEntryProp(entry, attribute.name))
        .flatMap((entry) => getEntryProp(entry, attribute.name))
        .filter((entry) => !!entry.id)
        .map((entry) => entry.id)
        .filter((id) => typeof store?.[attributeSlug]?.[`${id}`] === 'undefined');

      const dataToStore = await findEntriesForHierarchy(store, attributeSlug, hierarchy[attribute.name], deepness - 1, { ids });
      store = mergeObjects(dataToStore, store);
    }
  };
  await findAndFlattenRelationAttributes();

  return store;
}

async function findEntries(slug: string, deepness: number, { search, ids }: { search?: string; ids?: EntryId[] }) {
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
}

function buildFilterQuery(search = '') {
  let { filters, sort: sortRaw } = qs.parse(search);

  // TODO: improve query parsing
  const [attr, value] = (sortRaw as string)?.split(':') || [];
  const sort: Record<string, string> = {};
  if (attr && value) {
    sort[attr] = value.toLowerCase();
  }

  return {
    filters,
    sort,
  };
}

function convertData(exportContent: Export, options: { dataFormat: EnumValues<typeof dataFormats> }) {
  const converter = getConverter(options.dataFormat);

  const convertedData = converter.convertEntries(exportContent, options);

  return convertedData;
}

function getConverter(dataFormat: EnumValues<typeof dataFormats>) {
  const converter = dataConverterConfigs[dataFormat];

  if (!converter) {
    throw new Error(`Data format ${dataFormat} is not supported.`);
  }

  return converter;
}

type Populate = { populate: Record<string, Populate | true | undefined> };

function getPopulateFromSchema(slug: string, deepness = 5): Populate | true | undefined {
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
}

// TODO: type hierarchy
type Hierarchy = any;
// type Hierarchy = {
//   [key: string]: Hierarchy | string;
// };

function buildSlugHierarchy(slug: SchemaUID, deepness = 5): Hierarchy {
  slug = CustomSlugToSlug[slug] || slug;

  if (deepness <= 1) {
    return { __slug: slug };
  }

  const hierarchy: Hierarchy = {
    __slug: slug,
  };

  const model = getModel(slug);
  for (const [attributeName, attribute] of Object.entries(getModelPopulationAttributes(model)) as [string, Attribute][]) {
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
      // TODO: remove casting
      hierarchy[attributeName] = buildSlugHierarchy(CustomSlugs.MEDIA as SchemaUID, deepness - 1);
    }
  }

  return hierarchy;
}

function getModelPopulationAttributes(model: Schema) {
  if (model.uid === 'plugin::upload.file') {
    const { related, ...attributes } = model.attributes;
    return attributes;
  }

  return model.attributes;
}
