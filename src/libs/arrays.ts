export { isArraySafe, toArray };

module.exports = {
  isArraySafe,
  toArray,
};

/**
 * Check if value is an array.
 */
function isArraySafe<T>(val: T | T[]): val is T[] {
  return val && Array.isArray(val);
}

/**
 * Convert value to array if not already.
 * @param {*} val
 * @returns {Array<*>}
 */
function toArray<T>(val: T | T[]): T[] {
  return isArraySafe(val) ? val : [val];
}
