import axiosInstance from "./axiosInstance";

export const getCustomers = async () => {
  const response = await axiosInstance.get(
    `/customers?pagination[pageSize]=100000&sort[0]=createdAt:desc`,
  );
  const data = response.data.data;

  return data;
};

export const getCustomerById = async (id) => {
  const response = await axiosInstance.get(`/customers/${id}?populate=*`);
  return response.data.data;
};

export const createCustomer = async (customerData) => {
  const response = await axiosInstance.post("/customers", {
    data: customerData,
  });
  return response.data.data;
};

export const updateCustomer = async (id, customerData) => {
  const response = await axiosInstance.put(`/customers/${id}`, {
    data: customerData,
  });
  return response.data.data;
};

export const deleteCustomer = async (id) => {
  const response = await axiosInstance.delete(`/customers/${id}`);
  return response.data.data;
};
