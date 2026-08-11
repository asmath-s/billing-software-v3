import axiosInstance from "./axiosInstance";

export const getLocalList = async (params = "") => {
  const response = await axiosInstance.get(`/local-lists${params}`);
  return response.data;
};

export const getLastLocalList = async () => {
  const response = await axiosInstance.get(
    `/local-lists?filters[bill_no][$notNull]=true&sort=createdAt:desc&pagination[limit]=1`,
  );

  return response.data.data;
};

export const getLocalListById = async (documentId) => {
  const response = await axiosInstance.get(
    `/local-lists/${documentId}?populate=*`,
  );
  return response.data.data;
};

export const createLocalList = async (payload) => {
  const response = await axiosInstance.post("/local-lists", {
    data: payload,
  });
  return response.data.data;
};

export const updateLocalList = async (documentId, payload) => {
  const response = await axiosInstance.put(`/local-lists/${documentId}`, {
    data: payload,
  });
  return response.data.data;
};

export const deleteLocalList = async (documentId) => {
  const response = await axiosInstance.delete(`/local-lists/${documentId}`);
  return response.data.data;
};
