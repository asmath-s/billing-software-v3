import axiosInstance from "./axiosInstance";

export const getLocalExpense = async (params = "") => {
  const response = await axiosInstance.get(
    `/local-expenses?populate=*&${params}`,
  );
  return response;
};

export const getLastLocalExpense = async () => {
  const response = await axiosInstance.get(`/local-expenses`);

  return response.data.data;
};

export const getLocalExpenseById = async (documentId) => {
  const response = await axiosInstance.get(
    `/local-expenses/${documentId}?populate=*`,
  );
  return response.data.data;
};

export const createLocalExpense = async (payload) => {
  const response = await axiosInstance.post("/local-expenses", {
    data: payload,
  });
  return response.data.data;
};

export const updateLocalExpense = async (documentId, payload) => {
  const response = await axiosInstance.put(`/local-expenses/${documentId}`, {
    data: payload,
  });
  return response.data.data;
};

export const deleteLocalExpense = async (documentId) => {
  const response = await axiosInstance.delete(`/local-expenses/${documentId}`);
  return response.data.data;
};

export const getLocalExpenseAmounts = async (params = "") => {
  const response = await axiosInstance.get(`/local-expense-amounts${params}`);
  return response.data;
};

export const getLocalAuthenticatedExpenseAmounts = async (params = "") => {
  const response = await axiosInstance.get(
    `/local-authenticated-expense-amounts${params}`,
  );
  return response.data;
};
