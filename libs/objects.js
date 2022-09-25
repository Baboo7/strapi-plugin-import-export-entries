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

const logObj = (obj) => JSON.stringify(obj, null, '  ');

module.exports = {
  ObjectBuilder,
  logObj,
  isObjectSafe,
  isObjectEmpty,
};
