import { createContext, useContext } from "react";

export const FinancialYearContext = createContext(null);

export const useFinancialYear = () => {
  const context = useContext(FinancialYearContext);
  if (!context) {
    throw new Error(
      "useFinancialYear must be used within a FinancialYearProvider",
    );
  }
  return context;
};
