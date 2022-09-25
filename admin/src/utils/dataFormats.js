export const dataFormats = {
  CSV: 'csv',
  JSON: 'json',
  JSON_V2: 'json-v2',
};

export const dataFormatConfigs = {
  [dataFormats.CSV]: {
    fileExt: 'csv',
    fileContentType: 'text/csv',
    language: 'csv',
  },
  [dataFormats.JSON]: {
    fileExt: 'json',
    fileContentType: 'application/json',
    language: 'json',
  },
  [dataFormats.JSON_V2]: {
    fileExt: 'json',
    fileContentType: 'application/json',
    language: 'json',
  },
};
