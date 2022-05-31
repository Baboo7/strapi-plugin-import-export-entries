const convertEntryToStrArray = (entry, keys) => {
  return keys.map((key) => entry[key]);
};

const convertStrArrayToCsv = (entry) => {
  return entry
    .map(String)
    .map((v) => v.replaceAll('"', '""'))
    .map((v) => `"${v}"`)
    .join(",");
};

const convertToCsv = (entries) => {
  const columnTitles = Object.keys(entries[0]);
  const content = [convertStrArrayToCsv(columnTitles)]
    .concat(
      entries
        .map((entry) => convertEntryToStrArray(entry, columnTitles))
        .map(convertStrArrayToCsv)
    )
    .join("\r\n");
  return content;
};

const convertToJson = (entries) => {
  entries = JSON.stringify(entries, null, "\t");

  return entries;
};

module.exports = {
  convertToCsv,
  convertToJson,
};
