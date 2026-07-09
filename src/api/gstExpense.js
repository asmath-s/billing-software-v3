import axiosInstance from "./axiosInstance";

export const getGstExpenseList = async (params = "") => {
  const response = await axiosInstance.get(
    `/gst-expenses?populate=*&${params}`,
  );
  return response.data;
};

export const getGstExpenseListById = async (documentId) => {
  const response = await axiosInstance.get(
    `/gst-expenses/${documentId}?populate=*`,
  );
  return response.data.data;
};

export const createGstExpenseList = async (payload) => {
  const response = await axiosInstance.post("/gst-expenses", {
    data: payload,
  });
  return response.data.data;
};

export const updateGstExpenseList = async (documentId, payload) => {
  const response = await axiosInstance.put(`/gst-expenses/${documentId}`, {
    data: payload,
  });
  return response.data.data;
};

export const deleteGstExpenseList = async (documentId) => {
  const response = await axiosInstance.delete(`/gst-expenses/${documentId}`);
  return response.data.data;
};

export const getGstExpenseSummary = async (params = "") => {
  const response = await axiosInstance.get(`/gst-expenses-amount${params}`);
  return response.data;
};
