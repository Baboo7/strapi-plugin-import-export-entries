export { extract, isArraySafe, toArray };

module.exports = {
  extract,
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

function extract<T>(arr: T[], predicate: (item: T, index: number, arr: T[]) => boolean): T[] {
  const extractedValues = arr.filter(predicate);
  // Modify `arr` in place.
  arr.splice(0, arr.length, ...arr.filter((v, i, a) => !predicate(v, i, a)));
  return extractedValues;
}
