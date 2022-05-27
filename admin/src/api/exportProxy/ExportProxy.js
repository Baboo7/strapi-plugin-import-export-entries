import { request } from "@strapi/helper-plugin";

import pluginId from "../../pluginId";

const getByContentType = async ({ slug, search, applySearch }) => {
  const data = await request(`/${pluginId}/export/contentTypes`, {
    method: "POST",
    body: { slug, search, applySearch },
  });
  return data;
};

export default {
  getByContentType,
};
