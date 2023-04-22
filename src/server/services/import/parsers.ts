import csvtojson from 'csvtojson';
import { isArraySafe } from '../../../libs/arrays';
import { isObjectSafe } from '../../../libs/objects';
import { getModelAttributes } from '../../utils/models';
import { SchemaUID } from '@strapi/strapi/lib/types/utils';
import { EnumValues } from '../../../types';

const inputFormatToParser = {
  csv: parseCsv,
  jso: parseJso,
  json: parseJson,
} as const;

const InputFormats = Object.keys(inputFormatToParser) as InputFormat[];

export { InputFormats, parseInputData };

module.exports = {
  InputFormats,
  parseInputData,
};

type InputFormat = keyof typeof inputFormatToParser;
type InputDataRaw = Parameters<EnumValues<typeof inputFormatToParser>>[0];

/**
 * Parse input data.
 */
async function parseInputData(format: InputFormat, dataRaw: InputDataRaw, { slug }: { slug: SchemaUID }) {
  const parser = inputFormatToParser[format];
  if (!parser) {
    throw new Error(`Data input format ${format} is not supported.`);
  }

  const data = await parser(dataRaw as any, { slug });
  return data;
}

async function parseCsv(dataRaw: string, { slug }: { slug: SchemaUID }) {
  let data = await csvtojson().fromString(dataRaw);

  const relationNames = getModelAttributes(slug, { filterType: ['component', 'dynamiczone', 'media', 'relation'] }).map((a) => a.name);
  data = data.map((datum) => {
    for (let name of relationNames) {
      try {
        datum[name] = JSON.parse(datum[name]);
      } catch (err) {
        strapi.log.error(err);
      }
    }
    return datum;
  });

  return data;
}

async function parseJson(dataRaw: string) {
  let data = JSON.parse(dataRaw);
  return data;
}

async function parseJso(dataRaw: any[] | object) {
  if (!isObjectSafe(dataRaw) && !isArraySafe(dataRaw)) {
    throw new Error(`To import JSO, data must be an array or an object`);
  }

  return dataRaw;
}
