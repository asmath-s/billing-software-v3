import axiosInstance from "./axiosInstance";
import dayjs from "../utils/dayjs";

export const getGstList = async (params = "") => {
  const response = await axiosInstance.get(`/gst-lists?populate=*&${params}`);
  return response.data;
};

export const getLastGstList = async () => {
  const response = await axiosInstance.get(
    `/gst-lists?filters[bill_no][$notNull]=true&filters[bill_no][$ne]=&sort=createdAt:desc&pagination[limit]=1`,
  );

  return response.data.data;
};

export const getGstListById = async (documentId) => {
  const response = await axiosInstance.get(
    `/gst-lists/${documentId}?populate=*`,
  );
  return response.data.data;
};

export const createGstList = async (payload) => {
  const response = await axiosInstance.post("/gst-lists", {
    data: payload,
  });
  return response.data.data;
};

export const updateGstList = async (documentId, payload) => {
  const response = await axiosInstance.put(`/gst-lists/${documentId}`, {
    data: payload,
  });
  return response.data.data;
};

export const deleteGstList = async (documentId) => {
  const response = await axiosInstance.delete(`/gst-lists/${documentId}`);
  return response.data.data;
};

export const getGstSalesSummary = async (params = "") => {
  const response = await axiosInstance.get(`/gst-sales-amounts${params}`);
  return response.data;
};

/**
 * Fetch all matching GST Sales records across multiple pages from Strapi.
 * Dynamically handles pagination without using hardcoded large page sizes.
 *
 * Filters supported:
 * - customerDocumentId: Strapi documentId for customer
 * - fromDate & toDate: Date range
 * - role: Authenticated user bill_no filtering
 */
export const fetchAllGstSalesForExport = async ({
  customerDocumentId,
  fromDate,
  toDate,
  role,
}) => {
  let allRecords = [];
  let currentPage = 1;
  let pageCount = 1;
  const pageSize = 25;

  const baseParams = ["sort[0]=date:desc"];

  if (role === "authenticated") {
    baseParams.push("filters[bill_no][$notNull]=true");
    baseParams.push("filters[bill_no][$ne]=");
  }

  if (customerDocumentId) {
    baseParams.push(
      `filters[gst_customer][documentId][$eq]=${encodeURIComponent(customerDocumentId)}`,
    );
  }

  if (fromDate && toDate) {
    baseParams.push(
      `filters[date][$gte]=${dayjs(fromDate).format("YYYY-MM-DD")}`,
    );
    baseParams.push(
      `filters[date][$lte]=${dayjs(toDate).format("YYYY-MM-DD")}`,
    );
  }

  do {
    const pageParams = [
      ...baseParams,
      `pagination[page]=${currentPage}`,
      `pagination[pageSize]=${pageSize}`,
    ].join("&");

    const res = await getGstList(pageParams);
    const records = res?.data || [];
    const meta = res?.meta?.pagination;

    allRecords = allRecords.concat(records);

    if (meta && typeof meta.pageCount === "number") {
      pageCount = meta.pageCount;
    } else {
      break;
    }

    currentPage += 1;
  } while (currentPage <= pageCount);

  return allRecords;
};
