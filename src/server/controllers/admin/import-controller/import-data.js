import { CustomSlugs } from '../../../config/constants';
import { getAllSlugs } from '../../../utils/models';

const { getService } = require('../../../utils');

module.exports = ({ strapi }) => importData;

async function importData(ctx) {
  if (!hasPermissions(ctx)) {
    return ctx.forbidden();
  }

  const { user } = ctx.state;
  const { slug, data: dataRaw, format, idField } = ctx.request.body;

  const fileContent = await getService('import').parseInputData(format, dataRaw, { slug });

  let res;
  if (fileContent?.version === 2) {
    res = await getService('import').importDataV2(fileContent, {
      slug,
      user,
      idField,
    });
  } else {
    res = await getService('import').importData(dataRaw, {
      slug,
      format,
      user,
      idField,
    });
  }

  ctx.body = {
    failures: res.failures,
  };
}

function hasPermissions(ctx) {
  let { slug } = ctx.request.body;
  const { userAbility } = ctx.state;

  let slugsToCheck = [];
  if (slug === CustomSlugs.WHOLE_DB) {
    slugsToCheck.push(...getAllSlugs());
  } else {
    slugsToCheck.push(slug);
  }

  return slugsToCheck.every((slug) => hasPermissionForSlug(userAbility, slug));
}

function hasPermissionForSlug(userAbility, slug) {
  const permissionChecker = strapi.plugin('content-manager').service('permission-checker').create({ userAbility, model: slug });

  return permissionChecker.can.create() && permissionChecker.can.update();
}
