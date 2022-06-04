class ObjectBuilder {
  _obj = {};

  get() {
    return this._obj;
  }

  extend(obj) {
    this._obj = { ...this._obj, ...obj };
  }
}

module.exports = {
  ObjectBuilder,
};
