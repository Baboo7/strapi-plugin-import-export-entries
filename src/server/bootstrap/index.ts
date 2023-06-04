'use strict';

import { registerPermissionActions } from './register-permissions';

module.exports = async () => {
  await registerPermissionActions();
};
