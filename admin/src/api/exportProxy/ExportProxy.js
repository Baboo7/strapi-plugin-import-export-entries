import { request } from "@strapi/helper-plugin";

import pluginId from "../../pluginId";

const getByContentType = async ({
  slug,
  search,
  applySearch,
  exportFormat,
  relationsAsId,
  applyPopulate,
}) => {
  const data = await request(`/${pluginId}/export/contentTypes`, {
    method: "POST",
    body: { slug, search, applySearch, exportFormat, relationsAsId, applyPopulate },
  });
  return data;
};

export default {
  getByContentType,
};
