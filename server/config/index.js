'use strict';

module.exports = {
  default: {
    /**
     * Public hostname of the server.
     */
    serverPublicHostname: '',
    importUniqueIdentifierField: 'id',
  },
  validator: ({ serverPublicHostname, importUniqueIdentifierField } = {}) => {
    if (typeof serverPublicHostname !== 'string') {
      throw new Error('serverPublicHostname has to be a string.');
    }
    if (typeof importUniqueIdentifierField !== 'string') {
      throw new Error('importUniqueIdentifierField has to be a string.');
    }
  },
};
