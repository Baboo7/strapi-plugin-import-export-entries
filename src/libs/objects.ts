const deepmerge = require('deepmerge');

type Obj = Record<string | number | symbol, any>;

export class ObjectBuilder {
  _obj = {};

  get() {
    return this._obj;
  }

  extend(obj: any) {
    if (isObjectSafe(obj)) {
      this._obj = { ...this._obj, ...obj };
    }
  }
}

/**
 * Check if value is an object.
 */
export const isObjectSafe = <T>(val: T): val is Obj => {
  return val && !Array.isArray(val) && typeof val === 'object';
};

export const isObjectEmpty = (obj: Obj): boolean => {
  for (let i in obj) {
    return false;
  }
  return true;
};

export const mergeObjects = <X, Y>(x: X, y: Y): X & Y => {
  return deepmerge(x, y, {
    arrayMerge: (target: any, source: any) => {
      source.forEach((item: any) => {
        if (target.indexOf(item) === -1) {
          target.push(item);
        }
      });
      return target;
    },
  });
};

module.exports = {
  ObjectBuilder,
  isObjectSafe,
  isObjectEmpty,
  mergeObjects,
};
