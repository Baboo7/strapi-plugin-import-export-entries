const { importData } = require('./import');
const { importDataV2 } = require('./importV2');
const { parseInputData } = require('./parsers');

module.exports = {
  importData,
  importDataV2,
  parseInputData,
};
