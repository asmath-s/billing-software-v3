import axiosInstance from "./axiosInstance";
import dayjs from "../utils/dayjs";

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

/**
 * Fetch all matching Local Expense records across multiple pages from Strapi.
 * Dynamically handles pagination without using hardcoded large page sizes.
 *
 * Filters supported:
 * - status: "approved" | "production" | "hub"
 * - fromDate & toDate: Date range
 * - instruction: Substring search on instruction
 */
export const fetchAllLocalExpensesForExport = async ({
  status,
  fromDate,
  toDate,
  instruction,
}) => {
  let allRecords = [];
  let currentPage = 1;
  let pageCount = 1;
  const pageSize = 25;

  const baseParams = [
    "sort[0]=date:desc",
    "filters[approved][$eq]=true",
    `filters[current_status][$eq]=${status}`,
  ];

  if (instruction && instruction.trim()) {
    baseParams.push(
      `filters[instruction][$containsi]=${encodeURIComponent(instruction.trim())}`,
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

    const res = await getLocalExpense(pageParams);
    const records = res?.data?.data || [];
    const meta = res?.data?.meta?.pagination;

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
