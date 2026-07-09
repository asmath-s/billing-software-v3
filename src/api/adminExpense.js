import axiosInstance from "./axiosInstance";

export const getAdminExpense = async (params = "") => {
  const response = await axiosInstance.get(
    `/admin-expenses?populate=*&${params}`,
  );
  return response.data;
};

export const getLastAdminExpense = async () => {
  const response = await axiosInstance.get(`/admin-expenses`);

  return response.data.data;
};

export const getAdminExpenseById = async (documentId) => {
  const response = await axiosInstance.get(
    `/admin-expenses/${documentId}?populate=*`,
  );
  return response.data.data;
};

export const createAdminExpense = async (payload) => {
  const response = await axiosInstance.post("/admin-expenses", {
    data: payload,
  });
  return response.data.data;
};

export const updateAdminExpense = async (documentId, payload) => {
  const response = await axiosInstance.put(`/admin-expenses/${documentId}`, {
    data: payload,
  });
  return response.data.data;
};

export const deleteAdminExpense = async (documentId) => {
  const response = await axiosInstance.delete(`/admin-expenses/${documentId}`);
  return response.data.data;
};

export const getAdminExpenseAmounts = async (params = "") => {
  const response = await axiosInstance.get(`/admin-expense-amounts${params}`);
  return response.data;
};
