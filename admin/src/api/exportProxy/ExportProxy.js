import { request } from "@strapi/helper-plugin";

import pluginId from "../../pluginId";

const getByContentType = async ({
  slug,
  search,
  applySearch,
  exportFormat,
  relationsAsId,
}) => {
  const data = await request(`/${pluginId}/export/contentTypes`, {
    method: "POST",
    body: { slug, search, applySearch, exportFormat, relationsAsId },
  });
  return data;
};

export default {
  getByContentType,
};
