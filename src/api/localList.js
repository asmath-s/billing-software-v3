import axiosInstance from "./axiosInstance";
import dayjs from "../utils/dayjs";

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

/**
 * Fetch all matching Local Sales records across multiple pages from Strapi.
 * Dynamically handles pagination without using hardcoded large page sizes.
 *
 * Filters supported:
 * - status: "paid" | "pending" | "party"
 * - customerDocumentId: Strapi documentId for customer
 * - fromDate & toDate: Date range
 */
export const fetchAllLocalSalesForExport = async ({
  status,
  customerDocumentId,
  fromDate,
  toDate,
}) => {
  let allRecords = [];
  let currentPage = 1;
  let pageCount = 1;
  const pageSize = 25;

  const baseParams = [
    "populate=*",
    "sort[0]=date:desc",
    "filters[approved][$eq]=true",
    `filters[current_status][$eq]=${status}`,
  ];

  if (customerDocumentId) {
    baseParams.push(
      `filters[customer][documentId][$eq]=${encodeURIComponent(customerDocumentId)}`,
    );
  }

  if (fromDate && toDate) {
    const startDate = dayjs(fromDate).startOf("day").toISOString();
    const endDate = dayjs(toDate).endOf("day").toISOString();

    baseParams.push(
      `filters[$or][0][gpay][date][$gte]=${encodeURIComponent(startDate)}`,
      `filters[$or][0][gpay][date][$lte]=${encodeURIComponent(endDate)}`,
      `filters[$or][1][cash][date][$gte]=${encodeURIComponent(startDate)}`,
      `filters[$or][1][cash][date][$lte]=${encodeURIComponent(endDate)}`,
      `filters[$or][2][date][$gte]=${encodeURIComponent(startDate)}`,
      `filters[$or][2][date][$lte]=${encodeURIComponent(endDate)}`,
    );
  }

  do {
    const pageParams = [
      ...baseParams,
      `pagination[page]=${currentPage}`,
      `pagination[pageSize]=${pageSize}`,
    ].join("&");

    const res = await getLocalList(`?${pageParams}`);
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
