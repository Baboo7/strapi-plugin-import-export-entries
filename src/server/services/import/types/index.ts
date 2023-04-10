import { SchemaUID } from '@strapi/strapi/lib/types/utils';

export { FileEntry, FileId };

type FileId = string;
type FileEntry = {
  [attribute: string]:
    | string
    | number
    | string[]
    | number[]
    | {
        __component: SchemaUID;
        id: FileId;
      }
    | null;
};
