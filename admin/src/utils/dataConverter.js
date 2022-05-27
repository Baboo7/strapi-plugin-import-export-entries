export const dataFormats = {
  CSV: "csv",
  JSON: "json",
};

export const convertRowToArray = (row, keys) => {
  return keys.map((key) => row[key]);
};

export const convertArrayToCsv = (row) => {
  return row
    .map(String)
    .map((v) => v.replaceAll('"', '""'))
    .map((v) => `"${v}"`)
    .join(",");
};

export const convertToCsv = (rows) => {
  const columnTitles = Object.keys(rows[0]);
  const content = [convertArrayToCsv(columnTitles)]
    .concat(
      rows
        .map((row) => convertRowToArray(row, columnTitles))
        .map(convertArrayToCsv)
    )
    .join("\r\n");
  return content;
};

export const dataConverterConfigs = {
  [dataFormats.CSV]: {
    convertData: convertToCsv,
    fileExt: "csv",
    fileContentType: "text/csv",
  },
  [dataFormats.JSON]: {
    convertData: (data) => JSON.stringify(data, null, "\t"),
    fileExt: "json",
    fileContentType: "application/json",
  },
};
