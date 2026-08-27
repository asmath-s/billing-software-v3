import { findMatchingEntity } from "../utils/nameNormalizer";
import axiosInstance from "./axiosInstance";

export const getVendors = async () => {
  const response = await axiosInstance.get(
    `/vendors?pagination[pageSize]=100000&sort[0]=createdAt:desc`,
  );
  const data = response.data.data;

  return data;
};

export const getVendorById = async (id) => {
  const response = await axiosInstance.get(`/vendors/${id}?populate=*`);
  return response.data.data;
};

export const createVendor = async (vendorData) => {
  if (vendorData?.name) {
    try {
      const existingList = await getVendors();
      const match = findMatchingEntity(vendorData.name, existingList, "name");
      if (match) {
        return match;
      }
    } catch (err) {
      console.warn("Vendor deduplication check failed:", err);
    }
  }

  const response = await axiosInstance.post("/vendors", {
    data: vendorData,
  });
  return response.data.data;
};

export const updateVendor = async (id, vendorData) => {
  const response = await axiosInstance.put(`/vendors/${id}`, {
    data: vendorData,
  });
  return response.data.data;
};

export const deleteVendor = async (id) => {
  const response = await axiosInstance.delete(`/vendors/${id}`);
  return response.data.data;
};
