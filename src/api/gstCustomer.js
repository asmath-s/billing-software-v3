import { findMatchingEntity } from "../utils/nameNormalizer";
import axiosInstance from "./axiosInstance";

export const getGstCustomers = async () => {
  let allCustomers = [];
  let page = 1;
  let pageSize = 100;

  while (true) {
    const response = await axiosInstance.get(
      `/gst-customers?pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort[0]=createdAt:desc`,
    );
    const data = response.data.data;
    allCustomers = allCustomers.concat(data);

    if (data.length < pageSize) break;
    page++;
  }

  return allCustomers;
};

export const getGstCustomerById = async (id) => {
  const response = await axiosInstance.get(`/gst-customers/${id}?populate=*`);
  return response.data.data;
};

export const createGstCustomer = async (customerData) => {
  if (customerData?.name) {
    try {
      const existingList = await getGstCustomers();
      const match = findMatchingEntity(customerData.name, existingList, "name");
      if (match) {
        return match;
      }
    } catch (err) {
      console.warn("GST customer deduplication check failed:", err);
    }
  }

  const response = await axiosInstance.post("/gst-customers", {
    data: customerData,
  });
  return response.data.data;
};

export const updateGstCustomer = async (id, customerData) => {
  const response = await axiosInstance.put(`/gst-customers/${id}`, {
    data: customerData,
  });
  return response.data.data;
};

export const deleteGstCustomer = async (id) => {
  const response = await axiosInstance.delete(`/gst-customers/${id}`);
  return response.data.data;
};
