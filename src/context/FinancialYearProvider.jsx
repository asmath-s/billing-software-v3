import { useCallback, useMemo, useState } from "react";
import {
  getCurrentFinancialYear,
  getDynamicFinancialYears,
  getFinancialYearDateRange,
} from "../utils/financialYear";
import { FinancialYearContext } from "./financial-year-context";

const FinancialYearProvider = ({ children }) => {
  const [financialYear, setFinancialYearState] = useState(() => {
    const stored = localStorage.getItem("financialYear");
    if (stored) {
      const parsed = Number(stored);
      if (!isNaN(parsed) && parsed > 2000 && parsed < 2100) {
        return parsed;
      }
    }
    const current = getCurrentFinancialYear();
    localStorage.setItem("financialYear", String(current));
    return current;
  });

  const setFinancialYear = useCallback((newFY) => {
    const parsed = Number(newFY);
    if (!isNaN(parsed) && parsed > 2000 && parsed < 2100) {
      localStorage.setItem("financialYear", String(parsed));
      setFinancialYearState(parsed);
    }
  }, []);

  const range = useMemo(() => {
    return getFinancialYearDateRange(financialYear);
  }, [financialYear]);

  const availableYears = useMemo(() => {
    return getDynamicFinancialYears(5, 1);
  }, []);

  const value = useMemo(
    () => ({
      financialYear,
      availableYears,
      fromDate: range.fromDate,
      toDate: range.toDate,
      fromDateObj: range.fromDateObj,
      toDateObj: range.toDateObj,
      label: range.label,
      shortLabel: range.shortLabel,
      displayRange: range.displayRange,
      setFinancialYear,
    }),
    [financialYear, availableYears, range, setFinancialYear],
  );

  return (
    <FinancialYearContext.Provider value={value}>
      {children}
    </FinancialYearContext.Provider>
  );
};

export default FinancialYearProvider;
