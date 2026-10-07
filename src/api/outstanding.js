import axiosInstance from "./axiosInstance";
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
 * Builds date range filter query params for Strapi datetime fields.
 */
const buildDateFilterParams = (fromDate, toDate) => {
  if (!fromDate || !toDate) return [];
  const startIso = dayjs(fromDate).startOf("day").toISOString();
  const endIso = dayjs(toDate).endOf("day").toISOString();

  return [
    `filters[date][$gte]=${encodeURIComponent(startIso)}`,
    `filters[date][$lte]=${encodeURIComponent(endIso)}`,
  ];
};

/**
 * Fetch all Accounts Outstanding records from GST Sales, GST Expense, Admin, Local Expense, and Local Sales.
 * Normalizes all items to unified structure:
 * { id, date, source, sourceKey, name, credit, debit, rawItem }
 */
export const fetchOutstandingAccountRecords = async ({ fromDate, toDate } = {}) => {
  const dateParams = buildDateFilterParams(fromDate, toDate);

  // 1. GST Sales params (received_method = 'account')
  const gstSalesParams = [
    "populate=*",
    "sort[0]=date:desc",
    "filters[received_method][$eq]=account",
    ...dateParams,
  ];

  // 2. GST Expense params (sended_method = 'account')
  const gstExpenseParams = [
    "populate=*",
    "sort[0]=date:desc",
    "filters[sended_method][$eq]=account",
    ...dateParams,
  ];

  // 3. Admin Expense params (custom_type = 'account')
  const adminParams = [
    "populate=*",
    "sort[0]=date:desc",
    "filters[custom_type][$eq]=account",
    "filters[approved][$eq]=true",
    ...dateParams,
  ];

  // 4. Local Expense params (custom_type = 'account')
  const localExpenseParams = [
    "populate=*",
    "sort[0]=date:desc",
    "filters[custom_type][$eq]=account",
    "filters[approved][$eq]=true",
    ...dateParams,
  ];

  // 5. Local Sales params (custom_type = 'account' if present)
  const localSalesParams = [
    "populate=*",
    "sort[0]=date:desc",
    "filters[custom_type][$eq]=account",
    "filters[approved][$eq]=true",
    ...dateParams,
  ];

  const [
    gstSalesRes,
    gstExpenseRes,
    adminRes,
    localExpenseRes,
    localSalesRes,
  ] = await Promise.allSettled([
    fetchAllStrapiPages("/gst-lists", gstSalesParams),
    fetchAllStrapiPages("/gst-expenses", gstExpenseParams),
    fetchAllStrapiPages("/admin-expenses", adminParams),
    fetchAllStrapiPages("/local-expenses", localExpenseParams),
    fetchAllStrapiPages("/local-lists", localSalesParams),
  ]);

  const rawGstSales = gstSalesRes.status === "fulfilled" ? gstSalesRes.value : [];
  const rawGstExpenses = gstExpenseRes.status === "fulfilled" ? gstExpenseRes.value : [];
  const rawAdmin = adminRes.status === "fulfilled" ? adminRes.value : [];
  const rawLocalExpenses = localExpenseRes.status === "fulfilled" ? localExpenseRes.value : [];
  const rawLocalSales = localSalesRes.status === "fulfilled" ? localSalesRes.value : [];

  const normalized = [];

  // ── Normalize GST Sales (Inflow / Credit) ──
  rawGstSales.forEach((item) => {
    const isAccount = (item.received_method || "").toLowerCase() === "account";
    const amount = Number(item.received_amount || 0);
    if (!isAccount || amount <= 0) return;

    const customerName =
      item.gst_customer?.name ||
      (item.bill_no ? `GST Bill #${item.bill_no}` : "GST Customer");

    normalized.push({
      id: `gst-sales-${item.documentId || item.id}`,
      date: item.date,
      source: "GST Sales",
      sourceKey: "gstSales",
      name: customerName,
      billNo: item.bill_no || null,
      credit: amount,
      debit: 0,
      rawItem: item,
    });
  });

  // ── Normalize GST Expenses (Outflow / Debit) ──
  rawGstExpenses.forEach((item) => {
    const isAccount = (item.sended_method || "").toLowerCase() === "account";
    const amount = Number(item.sended_amount || 0);
    if (!isAccount || amount <= 0) return;

    const vendorName =
      item.vendor?.name ||
      (item.bill_no ? `GST Exp Bill #${item.bill_no}` : "Vendor");

    normalized.push({
      id: `gst-expense-${item.documentId || item.id}`,
      date: item.date,
      source: "GST Expense",
      sourceKey: "gstExpense",
      name: vendorName,
      billNo: item.bill_no || null,
      credit: 0,
      debit: amount,
      rawItem: item,
    });
  });

  // ── Normalize Admin Expenses / Receives ──
  rawAdmin.forEach((item) => {
    const isAccount = (item.custom_type || "").toLowerCase() === "account";
    const amount = Number(item.amount || 0);
    if (!isAccount || amount <= 0) return;

    const isReceive = (item.method || "").toLowerCase() === "receive";
    const name = item.instruction || (item.role ? `Admin (${item.role})` : "Admin");

    normalized.push({
      id: `admin-${item.documentId || item.id}`,
      date: item.date,
      source: "Admin",
      sourceKey: "admin",
      name,
      billNo: null,
      credit: isReceive ? amount : 0,
      debit: !isReceive ? amount : 0,
      rawItem: item,
    });
  });

  // ── Normalize Local Expenses ──
  rawLocalExpenses.forEach((item) => {
    const isAccount = (item.custom_type || "").toLowerCase() === "account";
    const amount = Number(item.amount || 0);
    if (!isAccount || amount <= 0) return;

    const isReceive = (item.method || "").toLowerCase() === "receive";
    const status = (item.current_status || "").toLowerCase();
    const sourceLabel =
      status === "production"
        ? "Production Expense"
        : status === "hub"
          ? "Hub Expense"
          : "Local Expense";

    normalized.push({
      id: `local-expense-${item.documentId || item.id}`,
      date: item.date,
      source: sourceLabel,
      sourceKey: "localExpense",
      name: item.instruction || sourceLabel,
      billNo: null,
      credit: isReceive ? amount : 0,
      debit: !isReceive ? amount : 0,
      rawItem: item,
    });
  });

  // ── Normalize Local Sales (if any custom_type = 'account') ──
  rawLocalSales.forEach((item) => {
    const isAccount = (item.custom_type || "").toLowerCase() === "account";
    const amount = Number(item.received_amount || 0);
    if (!isAccount || amount <= 0) return;

    const customerName =
      item.customer?.name ||
      (item.bill_no ? `Local Bill #${item.bill_no}` : "Local Customer");

    normalized.push({
      id: `local-sales-${item.documentId || item.id}`,
      date: item.date,
      source: "Local Sales",
      sourceKey: "localSales",
      name: customerName,
      billNo: item.bill_no || null,
      credit: amount,
      debit: 0,
      rawItem: item,
    });
  });

  // Sort descending by date
  normalized.sort((a, b) => new Date(b.date) - new Date(a.date));

  return normalized;
};
