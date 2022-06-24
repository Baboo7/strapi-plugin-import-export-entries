export const dataFormats = {
  CSV: 'csv',
  JSON: 'json',
};

export const dataFormatConfigs = {
  [dataFormats.CSV]: {
    fileExt: 'csv',
    fileContentType: 'text/csv',
  },
  [dataFormats.JSON]: {
    fileExt: 'json',
    fileContentType: 'application/json',
  },
};
