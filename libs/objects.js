class ObjectBuilder {
  _obj = {};

  get() {
    return this._obj;
  }

  extend(obj) {
    this._obj = { ...this._obj, ...obj };
  }
}

const isObjectEmpty = (obj) => {
  for (let i in obj) {
    return false;
  }
  return true;
};

module.exports = {
  ObjectBuilder,
  isObjectEmpty,
};
