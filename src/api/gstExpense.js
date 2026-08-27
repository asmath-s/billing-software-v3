import axiosInstance from "./axiosInstance";
import dayjs from "../utils/dayjs";

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

/**
 * Fetch all matching GST Expense records across multiple pages from Strapi.
 * Dynamically handles pagination without using hardcoded large page sizes.
 *
 * Filters supported:
 * - vendorDocumentId: Strapi documentId for vendor
 * - fromDate & toDate: Date range
 * - role: Authenticated user bill_no filtering
 */
export const fetchAllGstExpensesForExport = async ({
  vendorDocumentId,
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

  if (vendorDocumentId) {
    baseParams.push(
      `filters[vendor][documentId][$eq]=${encodeURIComponent(vendorDocumentId)}`,
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

    const res = await getGstExpenseList(pageParams);
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
