import axiosInstance from "./axiosInstance";
import { getCustomers } from "./customer";
import { getGstCustomers } from "./gstCustomer";
import dayjs from "../utils/dayjs";

/**
 * Helper to fetch all records across Strapi pagination.
 */
const fetchAllStrapiPages = async (endpoint, baseParams = []) => {
  try {
    let allRecords = [];
    let currentPage = 1;
    let pageCount = 1;
    const pageSize = 100;

    do {
      const queryParams = [
        ...baseParams,
        `pagination[page]=${currentPage}`,
        `pagination[pageSize]=${pageSize}`,
      ].join("&");

      const res = await axiosInstance.get(`${endpoint}?${queryParams}`);
      const data = res?.data?.data || res?.data || [];
      const meta = res?.data?.meta?.pagination;

      if (Array.isArray(data)) {
        allRecords = allRecords.concat(data);
      }

      if (meta && typeof meta.pageCount === "number") {
        pageCount = meta.pageCount;
      } else {
        break;
      }

      currentPage += 1;
    } while (currentPage <= pageCount);

    return allRecords;
  } catch (error) {
    console.error(`Failed to fetch records from ${endpoint}:`, error);
    return [];
  }
};

/**
 * Fetch all Local Sales Bills matching date range and optional customer filter.
 */
export const fetchLocalSalesBills = async ({
  fromDate,
  toDate,
  customerId,
} = {}) => {
  const baseParams = ["populate=*", "sort[0]=date:desc"];

  if (customerId) {
    baseParams.push(
      `filters[customer][documentId][$eq]=${encodeURIComponent(String(customerId).trim())}`,
    );
  }

  if (fromDate && toDate) {
    const startDate = dayjs(fromDate).startOf("day").toISOString();
    const endDate = dayjs(toDate).endOf("day").toISOString();
    baseParams.push(
      `filters[date][$gte]=${encodeURIComponent(startDate)}`,
      `filters[date][$lte]=${encodeURIComponent(endDate)}`,
    );
  }

  const records = await fetchAllStrapiPages("/local-lists", baseParams);

  // Filter for valid sales bills in JavaScript to avoid Strapi query operator errors
  return records.filter((item) => {
    const hasBillNo =
      item.bill_no !== null &&
      item.bill_no !== undefined &&
      String(item.bill_no).trim() !== "";
    const hasAmount = Number(item.total_amount || 0) > 0;
    return hasBillNo || hasAmount;
  });
};

/**
 * Fetch all GST Sales Bills matching date range and optional customer filter.
 */
export const fetchGstSalesBills = async ({
  fromDate,
  toDate,
  customerId,
} = {}) => {
  const baseParams = ["populate=*", "sort[0]=date:desc"];

  if (customerId) {
    baseParams.push(
      `filters[gst_customer][documentId][$eq]=${encodeURIComponent(String(customerId).trim())}`,
    );
  }

  if (fromDate && toDate) {
    const startDate = dayjs(fromDate).startOf("day").toISOString();
    const endDate = dayjs(toDate).endOf("day").toISOString();
    baseParams.push(
      `filters[date][$gte]=${encodeURIComponent(startDate)}`,
      `filters[date][$lte]=${encodeURIComponent(endDate)}`,
    );
  }

  const records = await fetchAllStrapiPages("/gst-lists", baseParams);

  return records.filter((item) => {
    const hasBillNo =
      item.bill_no !== null &&
      item.bill_no !== undefined &&
      String(item.bill_no).trim() !== "";
    return hasBillNo;
  });
};

/**
 * Aggregate Local Purchase History by Customer.
 * Merges registered customers with actual bill purchases.
 */
export const getLocalPurchaseHistorySummary = async ({
  fromDate,
  toDate,
} = {}) => {
  const [bills, registeredCustomers] = await Promise.all([
    fetchLocalSalesBills({ fromDate, toDate }),
    getCustomers().catch(() => []),
  ]);

  // Group bills by customer
  const customerMap = new Map();

  // 1. Initialize registered customers
  (registeredCustomers || []).forEach((cust) => {
    const key = cust.documentId || String(cust.id);
    customerMap.set(key, {
      customerId: key,
      documentId: cust.documentId || key,
      id: cust.id,
      name: cust.name || "Unnamed Customer",
      phonenumber: cust.phonenumber || "",
      billCount: 0,
      totalAmount: 0,
      bills: [],
    });
  });

  // 2. Aggregate bills
  (bills || []).forEach((bill) => {
    const billCust = bill.customer;
    const custKey =
      billCust?.documentId ||
      (billCust?.id ? String(billCust.id) : null) ||
      (billCust?.name ? `name-${billCust.name.trim().toLowerCase()}` : "unknown");

    const custName =
      billCust?.name || bill.customer_name || "Unknown Customer";
    const custPhone = billCust?.phonenumber || "";
    const billAmount = Number(bill.total_amount || 0);

    if (!customerMap.has(custKey)) {
      customerMap.set(custKey, {
        customerId: custKey,
        documentId: billCust?.documentId || custKey,
        id: billCust?.id || null,
        name: custName,
        phonenumber: custPhone,
        billCount: 0,
        totalAmount: 0,
        bills: [],
      });
    }

    const current = customerMap.get(custKey);
    current.billCount += 1;
    current.totalAmount += billAmount;
    current.bills.push(bill);
  });

  return Array.from(customerMap.values());
};

/**
 * Aggregate GST Purchase History by Customer.
 * Merges registered GST customers with actual bill purchases.
 */
export const getGstPurchaseHistorySummary = async ({
  fromDate,
  toDate,
} = {}) => {
  const [bills, registeredCustomers] = await Promise.all([
    fetchGstSalesBills({ fromDate, toDate }),
    getGstCustomers().catch(() => []),
  ]);

  const customerMap = new Map();

  // 1. Initialize registered GST customers
  (registeredCustomers || []).forEach((cust) => {
    const key = cust.documentId || String(cust.id);
    customerMap.set(key, {
      customerId: key,
      documentId: cust.documentId || key,
      id: cust.id,
      name: cust.name || "Unnamed Customer",
      phonenumber: cust.phonenumber || "",
      gstin: cust.gstin || "",
      address: cust.address || "",
      billCount: 0,
      baseAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
      bills: [],
    });
  });

  // 2. Aggregate bills
  (bills || []).forEach((bill) => {
    const billCust = bill.gst_customer;
    const custKey =
      billCust?.documentId ||
      (billCust?.id ? String(billCust.id) : null) ||
      (billCust?.name ? `name-${billCust.name.trim().toLowerCase()}` : "unknown");

    const custName =
      billCust?.name || bill.customer_name || "Unknown Customer";
    const custPhone = billCust?.phonenumber || "";
    const custGstin = billCust?.gstin || "";
    const custAddress = billCust?.address || "";
    const billAmount = Number(bill.total_amount || 0);
    const baseAmount = Number(bill.base_amount || 0);
    const taxAmount = Number(bill.tax_amount || 0);

    if (!customerMap.has(custKey)) {
      customerMap.set(custKey, {
        customerId: custKey,
        documentId: billCust?.documentId || custKey,
        id: billCust?.id || null,
        name: custName,
        phonenumber: custPhone,
        gstin: custGstin,
        address: custAddress,
        billCount: 0,
        baseAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        bills: [],
      });
    }

    const current = customerMap.get(custKey);
    current.billCount += 1;
    current.baseAmount += baseAmount;
    current.taxAmount += taxAmount;
    current.totalAmount += billAmount;
    current.bills.push(bill);
  });

  return Array.from(customerMap.values());
};
