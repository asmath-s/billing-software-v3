import axiosInstance from "./axiosInstance";

export const DEFAULT_QUOTATION_COLUMNS = [
  { id: "col_sno", label: "S.No", key: "sno", align: "center", width: "8%", type: "text" },
  { id: "col_desc", label: "Description / Particulars", key: "description", align: "left", width: "48%", type: "multiline" },
  { id: "col_qty", label: "Qty", key: "qty", align: "center", width: "12%", type: "number" },
  { id: "col_rate", label: "Rate (₹)", key: "rate", align: "right", width: "16%", type: "number" },
  { id: "col_amount", label: "Amount (₹)", key: "amount", align: "right", width: "16%", type: "amount" },
];

export const createInitialQuotationRow = (index = 1) => ({
  id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  sno: String(index),
  description: "",
  qty: "",
  rate: "",
  amount: "",
});

/**
 * Normalizes Strapi v4/v5 response items to flat objects with `id` and `documentId`.
 */
const normalizeStrapiItem = (item) => {
  if (!item) return null;
  const attributes = item.attributes || item;
  return {
    ...attributes,
    id: item.documentId || item.id,
    documentId: item.documentId || item.id,
    createdAt: item.createdAt || attributes.createdAt,
    updatedAt: item.updatedAt || attributes.updatedAt,
  };
};

/**
 * Calculate grand total from rows, tax, discount
 */
export const calculateQuotationGrandTotal = (rows = [], taxPercent = 0, discountAmount = 0) => {
  const subtotal = (rows || []).reduce((sum, r) => {
    const amt = parseFloat(r.amount) || (parseFloat(r.qty) * parseFloat(r.rate)) || 0;
    return sum + amt;
  }, 0);
  const taxAmount = (subtotal * (parseFloat(taxPercent) || 0)) / 100;
  const discount = parseFloat(discountAmount) || 0;
  return Math.round(Math.max(0, subtotal + taxAmount - discount));
};

/**
 * Generate next quotation number (e.g. QT-2026-001)
 */
export const getNextQuotationNo = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `QT-${currentYear}-`;

  try {
    const response = await axiosInstance.get(
      `/quotations?sort[0]=createdAt:desc&pagination[limit]=20`,
    );
    const rawList = response.data?.data || [];
    let maxNum = 0;

    rawList.forEach((raw) => {
      const item = normalizeStrapiItem(raw);
      const qNo = item?.quotationNo;
      if (qNo && typeof qNo === "string") {
        if (qNo.startsWith(prefix)) {
          const numPart = parseInt(qNo.replace(prefix, ""), 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        } else {
          const match = qNo.match(/\d+$/);
          if (match) {
            const numPart = parseInt(match[0], 10);
            if (!isNaN(numPart) && numPart > maxNum) {
              maxNum = numPart;
            }
          }
        }
      }
    });

    const nextNum = maxNum + 1;
    return `${prefix}${String(nextNum).padStart(3, "0")}`;
  } catch (error) {
    console.error("Failed to generate quotation no from API, fallback to timestamp:", error);
    return `${prefix}001`;
  }
};

/**
 * Fetch all quotations with search / pagination
 */
export const getQuotations = async (filters = {}) => {
  try {
    let queryParams = `/quotations?pagination[pageSize]=100000&sort[0]=createdAt:desc`;

    if (filters.search) {
      const s = encodeURIComponent(filters.search.trim());
      queryParams += `&filters[customerName][$containsi]=${s}`;
    }

    const response = await axiosInstance.get(queryParams);
    const rawList = response.data?.data || [];
    return rawList.map(normalizeStrapiItem);
  } catch (error) {
    console.error("Failed to get quotations from Strapi API:", error);
    throw error;
  }
};

/**
 * Fetch single quotation by ID or documentId
 */
export const getQuotationById = async (documentId) => {
  try {
    const response = await axiosInstance.get(`/quotations/${documentId}?populate=*`);
    return normalizeStrapiItem(response.data?.data);
  } catch (error) {
    console.error(`Failed to get quotation ${documentId}:`, error);
    throw error;
  }
};

/**
 * Create quotation in Strapi
 */
export const createQuotation = async (payload) => {
  try {
    const grandTotal = calculateQuotationGrandTotal(
      payload.rows,
      payload.taxPercent,
      payload.discountAmount,
    );

    const strapiPayload = {
      ...payload,
      grandTotal,
    };

    const response = await axiosInstance.post("/quotations", {
      data: strapiPayload,
    });
    return normalizeStrapiItem(response.data?.data);
  } catch (error) {
    console.error("Failed to create quotation in Strapi:", error);
    throw error;
  }
};

/**
 * Update quotation in Strapi
 */
export const updateQuotation = async (documentId, payload) => {
  try {
    const grandTotal = calculateQuotationGrandTotal(
      payload.rows,
      payload.taxPercent,
      payload.discountAmount,
    );

    const strapiPayload = {
      ...payload,
      grandTotal,
    };

    const response = await axiosInstance.put(`/quotations/${documentId}`, {
      data: strapiPayload,
    });
    return normalizeStrapiItem(response.data?.data);
  } catch (error) {
    console.error(`Failed to update quotation ${documentId}:`, error);
    throw error;
  }
};

/**
 * Delete quotation in Strapi
 */
export const deleteQuotation = async (documentId) => {
  try {
    const response = await axiosInstance.delete(`/quotations/${documentId}`);
    return normalizeStrapiItem(response.data?.data);
  } catch (error) {
    console.error(`Failed to delete quotation ${documentId}:`, error);
    throw error;
  }
};

/**
 * Duplicate / Clone quotation in Strapi
 */
export const duplicateQuotation = async (documentId) => {
  try {
    const existing = await getQuotationById(documentId);
    if (!existing) {
      throw new Error("Quotation not found");
    }

    const nextNo = await getNextQuotationNo();
    const clonedPayload = {
      ...existing,
      quotationNo: nextNo,
      date: new Date().toISOString().split("T")[0],
    };

    delete clonedPayload.id;
    delete clonedPayload.documentId;
    delete clonedPayload.createdAt;
    delete clonedPayload.updatedAt;

    return await createQuotation(clonedPayload);
  } catch (error) {
    console.error("Failed to duplicate quotation:", error);
    throw error;
  }
};
