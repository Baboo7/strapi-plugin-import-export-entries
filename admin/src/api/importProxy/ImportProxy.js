import { request } from "@strapi/helper-plugin";

const importData = async ({ slug, data, format }) => {
  const resData = await request(`/import-export/import`, {
    method: "POST",
    body: { slug, data, format },
  });
  return resData;
};

export default {
  importData,
};
