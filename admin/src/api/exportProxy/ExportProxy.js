import { request } from "@strapi/helper-plugin";

import pluginId from "../../pluginId";

const getByContentType = async ({
  slug,
  search,
  applySearch,
  exportFormat,
}) => {
  const data = await request(`/${pluginId}/export/contentTypes`, {
    method: "POST",
    body: { slug, search, applySearch, exportFormat },
  });
  return data;
};

export default {
  getByContentType,
};
