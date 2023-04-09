const { importData } = require('./import');
const { importDataV2 } = require('./import-v2');
const { parseInputData } = require('./parsers');

module.exports = {
  importData,
  importDataV2,
  parseInputData,
};
