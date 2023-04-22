import {
  CollectionTypeSchema as StrapiCollectionTypeSchema,
  ComponentSchema as StrapiComponentSchema,
  SingleTypeSchema as StrapiSingleTypeSchema,
  ComponentAttribute as StrapiComponentAttribute,
  ComponentValue as StrapiComponentValue,
  DynamicZoneAttribute as StrapiDynamicZoneAttribute,
  DynamicZoneValue as StrapiDynamicZoneValue,
  MediaAttribute as StrapiMediaAttribute,
  MediaValue as StrapiMediaValue,
  RelationAttribute as StrapiRelationAttribute,
  RelationValue as StrapiRelationValue,
} from '@strapi/strapi';
import { SchemaUID } from '@strapi/strapi/lib/types/utils';

export type {
  Attribute,
  ComponentAttribute,
  DynamicZoneAttribute,
  MediaAttribute,
  RelationAttribute,
  Entry,
  EntryId,
  ComponentEntry,
  DynamicZoneEntry,
  MediaEntry,
  RelationEntry,
  Schema,
  CollectionTypeSchema,
  SingleTypeSchema,
  ComponentSchema,
  User,
};

type User = any;

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
// TODO: handle polymorphic relations
// | StrapiRelationAttribute<'own-collection-type' | 'own-single-type', 'morphOne'>
// | StrapiRelationAttribute<'own-collection-type' | 'own-single-type', 'morphMany'>
// | StrapiRelationAttribute<'own-collection-type' | 'own-single-type', 'morphToOne'>
// | StrapiRelationAttribute<'own-collection-type' | 'own-single-type', 'morphToMany'>

// Media are not included in type because equals any atm.
type Entry = ComponentEntry | DynamicZoneEntry | RelationEntry;
type ComponentEntry = (WithI18n<StrapiComponentValue<'own-component', true>> & EntryBase) | (WithI18n<StrapiComponentValue<'own-component', false>> & EntryBase);
type DynamicZoneEntry = WithI18n<UnwrapArray<StrapiDynamicZoneValue<['own-component']>>> & EntryBase;
type MediaEntry = StrapiMediaValue;
type RelationEntry =
  | (WithI18n<StrapiRelationValue<'oneToOne', 'own-collection-type' | 'own-single-type'>> & EntryBase)
  | (WithI18n<StrapiRelationValue<'oneToMany', 'own-collection-type' | 'own-single-type'>> & EntryBase)
  | (WithI18n<StrapiRelationValue<'manyToOne', 'own-collection-type' | 'own-single-type'>> & EntryBase)
  | (WithI18n<StrapiRelationValue<'manyToMany', 'own-collection-type' | 'own-single-type'>> & EntryBase);
// TODO: handle polymorphic relations
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
    'import-export-entries'?: {
      idField?: string;
    };
  };
};
