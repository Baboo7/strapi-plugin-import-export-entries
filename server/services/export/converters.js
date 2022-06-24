const { getModelAttributes } = require('../../utils/models');

const convertToCsv = (entries, options) => {
  const columnTitles = getModelAttributes(options.slug).map((attr) => attr.name);
  const content = [convertStrArrayToCsv(columnTitles)].concat(entries.map((entry) => convertEntryToStrArray(entry, columnTitles)).map(convertStrArrayToCsv)).join('\r\n');
  return content;
};

const convertStrArrayToCsv = (entry) => {
  return entry
    .map(stringifyEntry)
    .map((v) => v.replace(/"/g, '""'))
    .map((v) => `"${v}"`)
    .join(',');
};

const stringifyEntry = (entry) => {
  if (typeof entry === 'object') {
    return JSON.stringify(entry);
  }

  return String(entry);
};

const convertEntryToStrArray = (entry, keys) => {
  return keys.map((key) => entry[key]);
};

const convertToJson = (entries, options) => {
  entries = JSON.stringify(entries, null, '\t');
  return entries;
};

const withBeforeConvert = (convertFn) => (entries, options) => {
  entries = beforeConvert(entries, options);
  entries = convertFn(entries, options);
  return entries;
};

const beforeConvert = (entries, options) => {
  if (options.relationsAsId) {
    const relationKeys = getModelAttributes(options.slug, 'relation').map((attr) => attr.name);
    entries = entries.map((entry) => {
      relationKeys.forEach((key) => {
        if (!entry[key]) {
          entry[key] = null;
        } else if (Array.isArray(entry[key])) {
          entry[key] = entry[key].map((rel) => {
            if (typeof rel === 'object') {
              return rel.id;
            }
            return rel;
          });
        } else if (typeof entry[key] === 'object') {
          entry[key] = entry[key].id;
        }
      });
      return entry;
    });
  }
  return entries;
};

module.exports = {
  convertToCsv: withBeforeConvert(convertToCsv),
  convertToJson: withBeforeConvert(convertToJson),
};
