import axiosInstance from "./axiosInstance";

export const getVendors = async () => {
  let allCustomers = [];
  let page = 1;
  let pageSize = 100;

  while (true) {
    const response = await axiosInstance.get(
      `/vendors?pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort[0]=createdAt:desc`,
    );
    const data = response.data.data;
    allCustomers = allCustomers.concat(data);

    if (data.length < pageSize) break;
    page++;
  }

  return allCustomers;
};

export const getVendorById = async (id) => {
  const response = await axiosInstance.get(`/vendors/${id}?populate=*`);
  return response.data.data;
};

export const createVendor = async (vendorData) => {
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
