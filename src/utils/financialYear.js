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
