const deepmerge = require('deepmerge');

class ObjectBuilder {
  _obj = {};

  get() {
    return this._obj;
  }

  extend(obj) {
    this._obj = { ...this._obj, ...obj };
  }
}

/**
 * Check if value is an object.
 * @param {*} val
 * @returns {boolean}
 */
const isObjectSafe = (val) => {
  return val && !Array.isArray(val) && typeof val === 'object';
};

const isObjectEmpty = (obj) => {
  for (let i in obj) {
    return false;
  }
  return true;
};

const mergeObjects = (x, y) => {
  return deepmerge(x, y, {
    arrayMerge: (target, source) => {
      source.forEach((item) => {
        if (target.indexOf(item) === -1) {
          target.push(item);
        }
      });
      return target;
    },
  });
};

const logObj = (obj) => JSON.stringify(obj, null, '  ');

module.exports = {
  ObjectBuilder,
  logObj,
  isObjectSafe,
  isObjectEmpty,
  mergeObjects,
};
