import { SchemaUID } from '@strapi/strapi/lib/types/utils';
import { toArray } from '../../libs/arrays';
import { Attribute, ComponentAttribute, DynamicZoneAttribute, Entry, MediaAttribute, RelationAttribute, Schema } from '../types';
import { AttributeType } from '@strapi/strapi';

export {
  getAllSlugs,
  getModel,
  getModelConfig,
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
  getModelConfig,
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

function getAllSlugs(): SchemaUID[] {
  return (Array.from(strapi.db.metadata) as [SchemaUID][]).map(([collectionName]) => collectionName).filter((collectionName) => collectionName.startsWith('api::'));
}

function getModel(slug: SchemaUID): Schema {
  return strapi.getModel(slug);
}

function getModelConfig(modelOrSlug: SchemaUID | Schema): { isLocalized: boolean } {
  const model = getModelFromSlugOrModel(modelOrSlug);

  return {
    isLocalized: !!model.pluginOptions?.i18n?.localized,
  };
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
    /**
     * Add `id` in the returned attributes.
     */
    addIdAttribute?: boolean;
  } = {},
): ((Attribute & { name: string }) | { name: 'id' })[] {
  const typesToKeep = options.filterType ? toArray(options.filterType) : [];
  const typesToFilterOut = options.filterOutType ? toArray(options.filterOutType) : [];
  const targetsToFilterOut = toArray(options.filterOutTarget || []);

  const attributesObj = getModel(slug).attributes;
  let attributes: ((Attribute & { name: string }) | { name: 'id' })[] = Object.keys(attributesObj)
    .reduce((acc, key) => acc.concat({ ...(attributesObj[key] as Attribute), name: key as string }), [] as ((Attribute & { name: string }) | { name: 'id' })[])
    .filter((attr) => !typesToFilterOut.includes((attr as any).type))
    .filter((attr) => !targetsToFilterOut.includes((attr as any).target));

  if (typesToKeep.length) {
    attributes = attributes.filter((attr) => typesToKeep.includes((attr as any).type));
  }

  if (options.addIdAttribute) {
    attributes.unshift({ name: 'id' });
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
