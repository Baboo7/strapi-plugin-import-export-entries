import { SchemaUID } from '@strapi/strapi/lib/types/utils';
import { toArray } from '../../libs/arrays';
import { Attribute, ComponentAttribute, DynamicZoneAttribute, Entry, MediaAttribute, RelationAttribute, Schema } from '../types';
import { AttributeType } from '@strapi/strapi';

export {
  getAllSlugs,
  getModel,
  getModelFromSlugOrModel,
  getModelAttributes,
  isComponentAttribute,
  isDynamicZoneAttribute,
  isMediaAttribute,
  isRelationAttribute,
  getEntryProp,
  setEntryProp,
  deleteEntryProp,
};

module.exports = {
  getAllSlugs,
  getModel,
  getModelFromSlugOrModel,
  getModelAttributes,
  isComponentAttribute,
  isDynamicZoneAttribute,
  isMediaAttribute,
  isRelationAttribute,
  getEntryProp,
  setEntryProp,
  deleteEntryProp,
};

function getAllSlugs({ includePluginsContentTypes = false }: { includePluginsContentTypes?: boolean } = {}): SchemaUID[] {
  return (Array.from(strapi.db.metadata) as [SchemaUID][])
    .filter(([collectionName]) => collectionName.startsWith('api::') || (includePluginsContentTypes && collectionName.startsWith('plugin::')))
    .map(([collectionName]) => collectionName);
}

function getModel(slug: SchemaUID): Schema {
  return strapi.getModel(slug);
}

function getModelFromSlugOrModel(modelOrSlug: SchemaUID | Schema): Schema {
  let model = modelOrSlug;
  if (typeof model === 'string') {
    model = getModel(modelOrSlug as SchemaUID);
  }

  return model;
}

/**
 * Get the attributes of a model.
 */
function getModelAttributes(
  slug: SchemaUID,
  options: {
    /**
     * Only attributes matching the type(s) will be kept.
     */
    filterType?: AttributeType | AttributeType[];
    /**
     * Remove attributes matching the specified type(s).
     */
    filterOutType?: AttributeType | AttributeType[];
    /**
     * Remove attributes matching the specified target(s).
     */
    filterOutTarget?: SchemaUID | SchemaUID[];
  } = {},
): (Attribute & { name: string })[] {
  const schema = getModel(slug);
  if (!schema) {
    return [];
  }

  const typesToKeep = options.filterType ? toArray(options.filterType) : [];
  const typesToFilterOut = options.filterOutType ? toArray(options.filterOutType) : [];
  const targetsToFilterOut = toArray(options.filterOutTarget || []);

  let attributes: (Attribute & { name: string })[] = Object.keys(schema.attributes)
    .reduce((acc, key) => acc.concat({ ...(schema.attributes[key] as Attribute), name: key as string }), [] as (Attribute & { name: string })[])
    .filter((attr) => !typesToFilterOut.includes((attr as any).type))
    .filter((attr) => !targetsToFilterOut.includes((attr as any).target));

  if (typesToKeep.length) {
    attributes = attributes.filter((attr) => typesToKeep.includes((attr as any).type));
  }

  return attributes;
}

function isComponentAttribute(attribute: any): attribute is ComponentAttribute {
  return (attribute as { type: AttributeType }).type === 'component';
}

function isDynamicZoneAttribute(attribute: any): attribute is DynamicZoneAttribute {
  return (attribute as { type: AttributeType }).type === 'dynamiczone';
}

function isMediaAttribute(attribute: any): attribute is MediaAttribute {
  return (attribute as { type: AttributeType }).type === 'media';
}

function isRelationAttribute(attribute: any): attribute is RelationAttribute {
  return (attribute as { type: AttributeType }).type === 'relation';
}

function getEntryProp(entry: Entry, prop: string): any {
  return (entry as any)[prop];
}

function setEntryProp(entry: Entry, prop: string, value: any): void {
  (entry as any)[prop] = value;
}

function deleteEntryProp(entry: Entry, prop: string): void {
  delete (entry as any)[prop];
}
