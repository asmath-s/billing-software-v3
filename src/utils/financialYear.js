import dayjs from "dayjs";

/**
 * Dynamically computes the current financial year based on today's date.
 * Rule:
 * If current month >= March (0-indexed: 2), current financial year is this calendar year.
 * If current month is January or February (0 or 1), financial year is previous calendar year.
 * @returns {number} e.g. 2026
 */
export const getCurrentFinancialYear = () => {
  const now = dayjs();
  const currentYear = now.year();
  const currentMonth = now.month(); // 0 = Jan, 1 = Feb, 2 = Mar...
  return currentMonth >= 2 ? currentYear : currentYear - 1;
};

/**
 * Dynamically computes the exact fromDate and toDate for any financial year using Day.js calendar rules.
 * No hardcoded "31" or static dates are used.
 * - Start date: Dynamic start of March for the starting year (Month index 2)
 * - End date: Dynamic end of March for the following year (Month index 2 of year + 1)
 * @param {number|string} fy
 * @returns {{ financialYear: number, fromDate: string, toDate: string, fromDateObj: Date, toDateObj: Date, label: string, shortLabel: string, displayRange: string }}
 */
export const getFinancialYearDateRange = (fy) => {
  const year = Number(fy) || getCurrentFinancialYear();
  const nextYear = year + 1;

  // Dynamic start of March for the starting year
  const startDayjs = dayjs(new Date(year, 2, 1)).startOf("month").startOf("day");

  // Dynamic end of March for the following year (calculated via calendar rules)
  const endDayjs = dayjs(new Date(nextYear, 2, 1)).endOf("month").endOf("day");

  const fromDate = startDayjs.format("YYYY-MM-DD");
  const toDate = endDayjs.format("YYYY-MM-DD");
  const fromDateObj = startDayjs.toDate();
  const toDateObj = endDayjs.toDate();

  const shortLabel = `${year}–${String(nextYear).slice(-2)}`;
  const label = `FY ${shortLabel}`;
  const displayRange = `${startDayjs.format("DD-MM-YYYY")} to ${endDayjs.format("DD-MM-YYYY")}`;

  return {
    financialYear: year,
    fromDate,
    toDate,
    fromDateObj,
    toDateObj,
    label,
    shortLabel,
    displayRange,
  };
};

/**
 * Dynamically generates available financial years based on the active/current year.
 * Automatically expands in future years without requiring manual code updates.
 * @param {number} pastCount - Number of previous financial years to include (default 5)
 * @param {number} futureCount - Number of future financial years to include (default 1)
 * @returns {number[]} Array of financial years in descending order
 */
export const getDynamicFinancialYears = (pastCount = 5, futureCount = 1) => {
  const currentFY = getCurrentFinancialYear();
  const years = [];
  for (let y = currentFY + futureCount; y >= currentFY - pastCount; y--) {
    years.push(y);
  }
  return years;
};

/**
 * Resolves the active API date parameters based on user-selected custom page filters
 * and global financial year fallback.
 *
 * Rules:
 * 1. fromDate filled + toDate empty -> shouldFetch: false (DO NOT CALL API)
 * 2. fromDate empty + toDate filled -> shouldFetch: false (DO NOT CALL API)
 * 3. fromDate filled + toDate filled -> shouldFetch: true, uses custom dates
 * 4. fromDate empty + toDate empty -> shouldFetch: true, uses global FY dates
 *
 * @param {Date|string|null} fromDate - Custom page From Date filter
 * @param {Date|string|null} toDate - Custom page To Date filter
 * @param {string} fyFromDate - Global FY default fromDate (YYYY-MM-DD)
 * @param {string} fyToDate - Global FY default toDate (YYYY-MM-DD)
 * @returns {{ shouldFetch: boolean, from: string|null, to: string|null, isCustom: boolean }}
 */
export const resolveApiDateRange = (fromDate, toDate, fyFromDate, fyToDate) => {
  // Partial custom date selection: Do NOT call API
  if ((fromDate && !toDate) || (!fromDate && toDate)) {
    return { shouldFetch: false, from: null, to: null, isCustom: false };
  }

  // Both custom dates present: use custom dates
  if (fromDate && toDate) {
    const fromStr = dayjs(fromDate).format("YYYY-MM-DD");
    const toStr = dayjs(toDate).format("YYYY-MM-DD");
    return {
      shouldFetch: true,
      from: fromStr,
      to: toStr,
      isCustom: true,
    };
  }

  // Both custom dates empty: use dynamic selected financial year dates
  return {
    shouldFetch: true,
    from: fyFromDate || null,
    to: fyToDate || null,
    isCustom: false,
  };
};
