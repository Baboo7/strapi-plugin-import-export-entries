/**
 * Check if value is an array.
 * @param {*} val
 * @returns {boolean}
 */
const isArraySafe = (val) => {
  return val && Array.isArray(val);
};

/**
 * Convert value to array if not already.
 * @param {*} val
 * @returns {Array<*>}
 */
const toArray = (val) => {
  return isArraySafe(val) ? val : [val];
};

module.exports = {
  isArraySafe,
  toArray,
};
