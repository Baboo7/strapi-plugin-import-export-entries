'use strict';

module.exports = {
  default: {
    /**
     * Public hostname of the server.
     */
    serverPublicHostname: '',
  },
  validator: ({ serverPublicHostname } = {}) => {
    if (typeof serverPublicHostname !== 'string') {
      throw new Error('serverPublicHostname has to be a string.');
    }
  },
};
