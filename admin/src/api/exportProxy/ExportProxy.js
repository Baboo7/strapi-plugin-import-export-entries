import { request } from "@strapi/helper-plugin";

const getByContentType = async ({ slug, search, applySearch }) => {
  const data = await request(`/import-export/export/contentTypes`, {
    method: "POST",
    body: { slug, search, applySearch },
  });
  return data;
};

export default {
  getByContentType,
};
