import { request } from "@strapi/helper-plugin";

import pluginId from "../../pluginId";

const importData = async ({ slug, data, format }) => {
  const resData = await request(`/${pluginId}/import`, {
    method: "POST",
    body: { slug, data, format },
  });
  return resData;
};

export default {
  importData,
};
