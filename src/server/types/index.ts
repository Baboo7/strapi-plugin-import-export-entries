import { Attribute as StrapiAttribute, Schema as StrapiSchema } from '@strapi/strapi';

export type {
  Attribute,
  AttributeType,
  CollectionTypeSchema,
  ComponentAttribute,
  ComponentEntry,
  ComponentSchema,
  DynamicZoneAttribute,
  DynamicZoneEntry,
  Entry,
  EntryId,
  MediaAttribute,
  MediaEntry,
  RelationAttribute,
  RelationEntry,
  Schema,
  SchemaUID,
  SingleTypeSchema,
  User,
};

type SchemaUID = 'plugin::upload.file' | string;

type User = any;

type AttributeType = StrapiAttribute.Kind;
type BaseAttribute = { name: string };
type Attribute = ComponentAttribute | DynamicZoneAttribute | MediaAttribute | RelationAttribute;
type ComponentAttribute = BaseAttribute & (StrapiAttribute.Component<any, true> | StrapiAttribute.Component<any, false>);
type DynamicZoneAttribute = BaseAttribute & StrapiAttribute.DynamicZone;
type MediaAttribute = BaseAttribute & StrapiAttribute.Media<'audios' | 'files' | 'images' | 'videos'>;
type RelationAttribute = BaseAttribute &
  (
    | StrapiAttribute.Relation<any, 'oneToOne'>
    | StrapiAttribute.Relation<any, 'oneToMany'>
    | StrapiAttribute.Relation<any, 'manyToOne'>
    | StrapiAttribute.Relation<any, 'manyToMany'>
  );
// TODO: handle polymorphic relations
// | StrapiAttribute.Relation<any, 'morphOne'>
// | StrapiAttribute.Relation<any, 'morphMany'>
// | StrapiAttribute.Relation<any, 'morphToOne'>
// | StrapiAttribute.Relation<any, 'morphToMany'>

// Media are not included in type because equals any atm.
type Entry = ComponentEntry | DynamicZoneEntry | RelationEntry;
type ComponentEntry = (WithI18n<StrapiAttribute.ComponentValue<any, true>> & EntryBase) | (WithI18n<StrapiAttribute.ComponentValue<any, false>> & EntryBase);
type DynamicZoneEntry = WithI18n<UnwrapArray<StrapiAttribute.DynamicZoneValue<[any]>>> & EntryBase;
type MediaEntry = StrapiAttribute.MediaValue;
type RelationEntry =
  | (WithI18n<StrapiAttribute.RelationValue<'oneToOne', any>> & EntryBase)
  | (WithI18n<StrapiAttribute.RelationValue<'oneToMany', any>> & EntryBase)
  | (WithI18n<StrapiAttribute.RelationValue<'manyToOne', any>> & EntryBase)
  | (WithI18n<StrapiAttribute.RelationValue<'manyToMany', any>> & EntryBase);
// TODO: handle polymorphic relations
// | (WithI18n<StrapiAttribute.RelationValue<'morphOne', any>> & EntryBase)
// | (WithI18n<StrapiAttribute.RelationValue<'morphMany', any>> & EntryBase)
// | (WithI18n<StrapiAttribute.RelationValue<'morphToOne', any>> & EntryBase)
// | (WithI18n<StrapiAttribute.RelationValue<'morphToMany', any>> & EntryBase);
type EntryBase = { id: EntryId };
type EntryId = number | string;
type WithI18n<T> = UnwrapArray<T> & {
  localizations?: UnwrapArray<T>[];
  locale?: string;
};
type UnwrapArray<T> = T extends Array<infer U> ? U : T;

type Schema = CollectionTypeSchema | SingleTypeSchema | ComponentSchema;
type CollectionTypeSchema = StrapiSchema.CollectionType & SchemaPluginOptions;
type SingleTypeSchema = StrapiSchema.SingleType & SchemaPluginOptions;
type ComponentSchema = StrapiSchema.Component & { uid: SchemaUID } & SchemaPluginOptions;
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
