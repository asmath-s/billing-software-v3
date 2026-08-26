import dayjs from "dayjs";

/**
 * Dynamically computes the current financial year starting year based on today's date.
 * Financial Year Rule:
 * - If current month is January (0), February (1), or March (2) (month < 3 / before April):
 *     financialYearStart = currentYear - 1
 *     financialYearEnd = currentYear
 * - If current month is April (3) through December (11):
 *     financialYearStart = currentYear
 *     financialYearEnd = currentYear + 1
 *
 * @returns {number} e.g. 2026 for FY 2026 - 2027
 */
export const getCurrentFinancialYear = () => {
  const now = dayjs();
  const currentYear = now.year();
  const currentMonth = now.month(); // 0 = Jan, 1 = Feb, 2 = Mar, 3 = Apr...
  return currentMonth < 3 ? currentYear - 1 : currentYear;
};

/**
 * Dynamically computes the exact fromDate and toDate for any financial year without hardcoding dates.
 * - Start date: 01 April of the starting year (Month index 3)
 * - End date: Dynamic end of March for the following year (Month index 2 of year + 1 calculated via Day.js endOf("month"))
 *
 * Examples:
 * - 2026 -> 01 April 2026 to 31 March 2027
 * - 2027 -> 01 April 2027 to 31 March 2028
 *
 * @param {number|string} fy
 * @returns {{ financialYear: number, fromDate: string, toDate: string, fromDateObj: Date, toDateObj: Date, label: string, shortLabel: string, displayRange: string }}
 */
export const getFinancialYearDateRange = (fy) => {
  const year = Number(fy) || getCurrentFinancialYear();
  const nextYear = year + 1;

  // Dynamic start of April for the starting year (Month index 3 is April)
  const startDayjs = dayjs(new Date(year, 3, 1)).startOf("day");

  // Dynamic end of March for the following year (Month index 2 is March; endOf("month") dynamically calculates actual last day)
  const endDayjs = dayjs(new Date(nextYear, 2, 1)).endOf("month").endOf("day");

  const fromDate = startDayjs.format("YYYY-MM-DD");
  const toDate = endDayjs.format("YYYY-MM-DD");
  const fromDateObj = startDayjs.toDate();
  const toDateObj = endDayjs.toDate();

  const shortLabel = `${year} - ${nextYear}`;
  const label = `FY ${year} - ${nextYear}`;
  const displayRange = `${startDayjs.format("DD MMMM YYYY")} to ${endDayjs.format("DD MMMM YYYY")}`;

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
 * Dynamically generates exactly 5 financial year ranges starting from the current financial year in descending order.
 * Automatically updates when the calendar date changes.
 *
 * Example:
 * If current FY is 2026 - 2027:
 * [2026, 2025, 2024, 2023, 2022]
 *
 * @param {number} count - Number of financial years to generate (default 5)
 * @returns {number[]} Array of 5 financial years in descending order
 */
export const getDynamicFinancialYears = (count = 5) => {
  const currentFY = getCurrentFinancialYear();
  const years = [];
  for (let i = 0; i < count; i++) {
    years.push(currentFY - i);
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
