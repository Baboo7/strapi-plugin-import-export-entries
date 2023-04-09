/**
 * Check if value is an array.
 */
export const isArraySafe = <T>(val: T | T[]): val is T[] => {
  return val && Array.isArray(val);
};

/**
 * Convert value to array if not already.
 * @param {*} val
 * @returns {Array<*>}
 */
export const toArray = <T>(val: T | T[]): T[] => {
  return isArraySafe(val) ? val : [val];
};

module.exports = {
  isArraySafe,
  toArray,
};
