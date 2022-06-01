const convertEntryToStrArray = (entry, keys) => {
  return keys.map((key) => entry[key]);
};

const convertStrArrayToCsv = (entry) => {
  return entry
    .map(String)
    .map((v) => v.replace(/"/g, '""'))
    .map((v) => `"${v}"`)
    .join(",");
};

const convertToCsv = (entries, options) => {
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

const convertToJson = (entries, options) => {
  entries = JSON.stringify(entries, null, "\t");
  return entries;
};

const withBeforeConvert = (convertFn) => (entries, options) => {
  entries = beforeConvert(entries, options);
  entries = convertFn(entries, options);
  return entries;
};

const beforeConvert = (entries, options) => {
  if (options.relationsAsId) {
    const relationKeys = getAttributeNamesByType(options.slug, "relation");
    entries = entries.map((entry) => {
      relationKeys.forEach((key) => (entry[key] = entry[key].id));
      return entry;
    });
  }
  return entries;
};

const getAttributeNamesByType = (slug, type) => {
  const attributes = strapi.db.metadata.get(slug).attributes;
  return Object.keys(attributes).filter((key) => attributes[key].type === type);
};

module.exports = {
  convertToCsv: withBeforeConvert(convertToCsv),
  convertToJson: withBeforeConvert(convertToJson),
};
