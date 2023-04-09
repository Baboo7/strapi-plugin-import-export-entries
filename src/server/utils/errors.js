const _ = require('lodash');

const errorCodes = {};

const errorMessages = {};

Object.keys(errorMessages).forEach(
  (k) =>
    (errorMessages[k] = _.template(errorMessages[k], {
      interpolate: /\{\s*(\S+)\s*\}/g,
    })),
);

class BusinessError extends Error {
  constructor(errorCodeOrMessage, interpolations) {
    const isErrorCode = !!errorCodes[errorCodeOrMessage];

    super(isErrorCode ? errorMessages[errorCodeOrMessage](interpolations) : errorCodeOrMessage);

    this.name = this.constructor.name;
    this.code = isErrorCode ? errorCodeOrMessage : 'UNDEFINED';
  }
}

module.exports = {
  BusinessError,
  errorCodes,
};
