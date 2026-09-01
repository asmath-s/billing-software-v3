import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAdminExpense } from "../../api/adminExpense";
import { getGstExpenseSummary } from "../../api/gstExpense";
import { getGstSalesSummary } from "../../api/gstList";
import { getLocalAmounts } from "../../api/localAmount";
import {
  getLocalExpense,
  getLocalExpenseAmounts,
} from "../../api/localExpense";
import Datepicker from "../../components/Datepicker/Datepicker";
import { ChartIcon, RefreshIcon } from "../../components/icons";
import { useFinancialYear } from "../../context/financial-year-context";
import MainLayout from "../../layouts/MainLayout";
import { resolveApiDateRange } from "../../utils/financialYear";

/* -----------------------------------------------------------------
   Number and Currency Formatter (Indian Currency Format)
------------------------------------------------------------------*/
const formatINR = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100);

const formatCompactINR = (val = 0) => {
  const num = Number(val || 0);
  if (Math.abs(num) >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (Math.abs(num) >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  if (Math.abs(num) >= 1000) return `₹${(num / 1000).toFixed(1)}k`;
  return `₹${formatINR(num)}`;
};

const getNum = (v) => {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

// Financial Year Months (April to March)
const FY_MONTHS = [
  { name: "Apr", monthIndex: 3, offset: 0, key: 0 },
  { name: "May", monthIndex: 4, offset: 0, key: 1 },
  { name: "Jun", monthIndex: 5, offset: 0, key: 2 },
  { name: "Jul", monthIndex: 6, offset: 0, key: 3 },
  { name: "Aug", monthIndex: 7, offset: 0, key: 4 },
  { name: "Sep", monthIndex: 8, offset: 0, key: 5 },
  { name: "Oct", monthIndex: 9, offset: 0, key: 6 },
  { name: "Nov", monthIndex: 10, offset: 0, key: 7 },
  { name: "Dec", monthIndex: 11, offset: 0, key: 8 },
  { name: "Jan", monthIndex: 0, offset: 1, key: 9 },
  { name: "Feb", monthIndex: 1, offset: 1, key: 10 },
  { name: "Mar", monthIndex: 2, offset: 1, key: 11 },
];

const AVAILABLE_YEARS = [2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020];

/* -----------------------------------------------------------------
   Category Matchers
------------------------------------------------------------------*/
const isElectricBill = (inst) => {
  if (!inst || typeof inst !== "string") return false;
  const s = inst.toLowerCase().trim();
  return (
    s.includes("electric") ||
    s.includes("electricity") ||
    s.includes("current") ||
    s.includes("power") ||
    s.includes("tneb") ||
    s.includes("eb bill") ||
    s.includes("eb charge") ||
    s.includes("eb amount") ||
    s.includes("eb payment") ||
    /\beb\b/i.test(s) ||
    /\be\.b\b/i.test(s)
  );
};

const isOfficeRent = (inst) => {
  if (!inst || typeof inst !== "string") return false;
  const s = inst.toLowerCase().trim();
  return s.includes("office rent") || s.includes("officerent");
};

/* -----------------------------------------------------------------
   Custom Tooltip for Local Sales vs Local Expense
------------------------------------------------------------------*/
const LocalChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="min-w-[280px] rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-md">
      <div className="mb-3 border-b border-slate-100 pb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {label || data.period}
        </p>
      </div>

      <div className="space-y-3.5">
        {/* Local Sales Breakdown */}
        <div className="rounded-xl border border-emerald-100/80 bg-emerald-50/40 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm" />
              <span className="text-xs font-bold text-emerald-950">
                Local Sales
              </span>
            </div>
            <span className="text-xs font-extrabold text-emerald-700">
              ₹ {formatINR(data.localSales)}
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-emerald-100/80 pt-2 text-[11px]">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">Cash:</span>
              <span className="font-semibold text-slate-800">
                ₹ {formatINR(data.localSalesCash)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">GPay:</span>
              <span className="font-semibold text-slate-800">
                ₹ {formatINR(data.localSalesGpay)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">Account:</span>
              <span className="font-semibold text-slate-800">
                ₹ {formatINR(data.localSalesAccount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">Pending:</span>
              <span className="font-semibold text-amber-700">
                ₹ {formatINR(data.localSalesPending)}
              </span>
            </div>
          </div>
        </div>

        {/* Local Expense Breakdown */}
        <div className="rounded-xl border border-rose-100/80 bg-rose-50/40 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-sm" />
              <span className="text-xs font-bold text-rose-950">
                Local Expense
              </span>
            </div>
            <span className="text-xs font-extrabold text-rose-700">
              ₹ {formatINR(data.localExpense)}
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-rose-100/80 pt-2 text-[11px]">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">Cash:</span>
              <span className="font-semibold text-slate-800">
                ₹ {formatINR(data.localExpenseCash)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">GPay:</span>
              <span className="font-semibold text-slate-800">
                ₹ {formatINR(data.localExpenseGpay)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">Account:</span>
              <span className="font-semibold text-slate-800">
                ₹ {formatINR(data.localExpenseAccount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">Pending:</span>
              <span className="font-semibold text-amber-700">
                ₹ {formatINR(data.localExpensePending)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -----------------------------------------------------------------
   Custom Tooltip for GST Sales vs GST Expense
------------------------------------------------------------------*/
const GstChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="min-w-[280px] rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-md">
      <div className="mb-3 border-b border-slate-100 pb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {label || data.period}
        </p>
      </div>

      <div className="space-y-3.5">
        {/* GST Sales Breakdown */}
        <div className="rounded-xl border border-emerald-100/80 bg-emerald-50/40 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shadow-sm" />
              <span className="text-xs font-bold text-emerald-950">
                GST Sales
              </span>
            </div>
            <span className="text-xs font-extrabold text-emerald-700">
              ₹ {formatINR(data.gstSales)}
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-emerald-100/80 pt-2 text-[11px]">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">Cash:</span>
              <span className="font-semibold text-slate-800">
                ₹ {formatINR(data.gstSalesCash)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">GPay:</span>
              <span className="font-semibold text-slate-800">
                ₹ {formatINR(data.gstSalesGpay)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">Account:</span>
              <span className="font-semibold text-slate-800">
                ₹ {formatINR(data.gstSalesAccount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">Pending:</span>
              <span className="font-semibold text-amber-700">
                ₹ {formatINR(data.gstSalesPending)}
              </span>
            </div>
          </div>
        </div>

        {/* GST Expense Breakdown */}
        <div className="rounded-xl border border-rose-100/80 bg-rose-50/40 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-600 shadow-sm" />
              <span className="text-xs font-bold text-rose-950">
                GST Expense
              </span>
            </div>
            <span className="text-xs font-extrabold text-rose-700">
              ₹ {formatINR(data.gstExpense)}
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-rose-100/80 pt-2 text-[11px]">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">Cash:</span>
              <span className="font-semibold text-slate-800">
                ₹ {formatINR(data.gstExpenseCash)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">GPay:</span>
              <span className="font-semibold text-slate-800">
                ₹ {formatINR(data.gstExpenseGpay)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">Account:</span>
              <span className="font-semibold text-slate-800">
                ₹ {formatINR(data.gstExpenseAccount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">Pending:</span>
              <span className="font-semibold text-amber-700">
                ₹ {formatINR(data.gstExpensePending)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -----------------------------------------------------------------
   Custom Tooltip for Electric Bill Chart (Month-wise)
------------------------------------------------------------------*/
const ElectricChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="min-w-[260px] rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-md">
      <div className="mb-3 border-b border-slate-100 pb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {label || data.period}
        </p>
      </div>

      <div className="rounded-xl border border-amber-100/80 bg-amber-50/40 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm" />
            <span className="text-xs font-bold text-amber-950">
              Electric Bill
            </span>
          </div>
          <span className="text-xs font-extrabold text-amber-700">
            ₹ {formatINR(data.electricTotal)}
          </span>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-amber-100/80 pt-2 text-[11px]">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-slate-400">Cash:</span>
            <span className="font-semibold text-slate-800">
              ₹ {formatINR(data.electricCash)}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-slate-400">GPay:</span>
            <span className="font-semibold text-slate-800">
              ₹ {formatINR(data.electricGpay)}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-slate-400">Account:</span>
            <span className="font-semibold text-slate-800">
              ₹ {formatINR(data.electricAccount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-slate-400">Pending:</span>
            <span className="font-semibold text-amber-700">
              ₹ {formatINR(data.electricPending)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -----------------------------------------------------------------
   Custom Tooltip for Rent Chart (Month-wise)
------------------------------------------------------------------*/
const RentChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="min-w-[260px] rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-md">
      <div className="mb-3 border-b border-slate-100 pb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {label || data.period}
        </p>
      </div>

      <div className="rounded-xl border border-indigo-100/80 bg-indigo-50/40 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 shadow-sm" />
            <span className="text-xs font-bold text-indigo-950">
              Office Rent (Hub)
            </span>
          </div>
          <span className="text-xs font-extrabold text-indigo-700">
            ₹ {formatINR(data.rentTotal)}
          </span>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-indigo-100/80 pt-2 text-[11px]">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-slate-400">Cash:</span>
            <span className="font-semibold text-slate-800">
              ₹ {formatINR(data.rentCash)}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-slate-400">GPay:</span>
            <span className="font-semibold text-slate-800">
              ₹ {formatINR(data.rentGpay)}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-slate-400">Account:</span>
            <span className="font-semibold text-slate-800">
              ₹ {formatINR(data.rentAccount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-slate-400">Pending:</span>
            <span className="font-semibold text-amber-700">
              ₹ {formatINR(data.rentPending)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -----------------------------------------------------------------
   Analytics Page Component
------------------------------------------------------------------*/
const Analytics = () => {
  const {
    financialYear,
    fromDate: fyFromDate,
    toDate: fyToDate,
  } = useFinancialYear();

  // Filters State
  const [viewMode, setViewMode] = useState("all"); // 'all' | 'month' | 'year' | 'custom'
  const [selectedYear, setSelectedYear] = useState(financialYear);
  const [selectedMonth, setSelectedMonth] = useState("all"); // 'all' or 0..11
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedYear(financialYear);
  }, [financialYear]);

  // Aggregated Data
  const [chartData, setChartData] = useState([]);
  const [summaryTotals, setSummaryTotals] = useState({
    localSales: 0,
    localSalesCash: 0,
    localSalesGpay: 0,
    localSalesAccount: 0,
    localSalesPending: 0,
    localExpense: 0,
    localExpenseCash: 0,
    localExpenseGpay: 0,
    localExpenseAccount: 0,
    localExpensePending: 0,
    gstSales: 0,
    gstSalesCash: 0,
    gstSalesGpay: 0,
    gstSalesAccount: 0,
    gstSalesPending: 0,
    gstExpense: 0,
    gstExpenseCash: 0,
    gstExpenseGpay: 0,
    gstExpenseAccount: 0,
    gstExpensePending: 0,
    electricTotal: 0,
    electricCash: 0,
    electricGpay: 0,
    electricAccount: 0,
    electricPending: 0,
    rentTotal: 0,
    rentCash: 0,
    rentGpay: 0,
    rentAccount: 0,
    rentPending: 0,
    cash: 0,
    gpay: 0,
    account: 0,
    totalSales: 0,
    totalExpense: 0,
    netAmount: 0,
  });

  /* -----------------------------------------------------------------
     Fetch summary helper for any date interval
  ------------------------------------------------------------------*/
  const fetchIntervalSummary = async (fromStr = null, toStr = null) => {
    const dateQuery =
      fromStr && toStr ? `?fromDate=${fromStr}&toDate=${toStr}` : "";

    // Hub rent query (strictly hub status and instruction contains "Office Rent")
    const hubRentParams = [
      "sort[0]=date:desc",
      "filters[current_status][$eq]=hub",
      `filters[instruction][$containsi]=${encodeURIComponent("Office Rent")}`,
    ];
    if (fromStr && toStr) {
      hubRentParams.push(
        `filters[date][$gte]=${encodeURIComponent(dayjs(fromStr).startOf("day").toISOString())}`,
        `filters[date][$lte]=${encodeURIComponent(dayjs(toStr).endOf("day").toISOString())}`,
      );
    }
    hubRentParams.push("pagination[pageSize]=100");

    // Electric bill query (from local-expenses and admin-expenses)
    const electricFilterParams = [];
    if (fromStr && toStr) {
      electricFilterParams.push(
        `filters[date][$gte]=${encodeURIComponent(dayjs(fromStr).startOf("day").toISOString())}`,
        `filters[date][$lte]=${encodeURIComponent(dayjs(toStr).endOf("day").toISOString())}`,
      );
    }
    electricFilterParams.push("pagination[pageSize]=100");
    electricFilterParams.push("sort[0]=date:desc");

    const [
      localSalesRes,
      gstSalesRes,
      localExpRes,
      gstExpRes,
      hubRentRes,
      rawLocalExpRes,
      rawAdminExpRes,
    ] = await Promise.allSettled([
      getLocalAmounts(dateQuery),
      getGstSalesSummary(dateQuery),
      getLocalExpenseAmounts(dateQuery),
      getGstExpenseSummary(dateQuery),
      getLocalExpense(hubRentParams.join("&")),
      getLocalExpense(electricFilterParams.join("&")),
      getAdminExpense(electricFilterParams.join("&")),
    ]);

    const localSalesData =
      localSalesRes.status === "fulfilled" ? localSalesRes.value : {};
    const gstSalesData =
      gstSalesRes.status === "fulfilled" ? gstSalesRes.value : {};
    const localExpData =
      localExpRes.status === "fulfilled" ? localExpRes.value : {};
    const gstExpData =
      gstExpRes.status === "fulfilled" ? gstExpRes.value : {};

    // 1. Local Sales Extraction
    let localSales = getNum(localSalesData?.sales_total);
    if (!localSales) {
      localSales =
        getNum(localSalesData?.local_total?.total_amount) ||
        getNum(localSalesData?.local_total?.total_cash) +
          getNum(localSalesData?.local_total?.total_gpay) +
          getNum(localSalesData?.local_pending?.total_balance) +
          getNum(localSalesData?.local_party?.total_balance) ||
        getNum(localSalesData?.local_list?.total_amount) +
          getNum(localSalesData?.local_paid?.total_amount) +
          getNum(localSalesData?.local_pending?.total_amount) +
          getNum(localSalesData?.local_party?.total_amount);
    }

    const localSalesCash =
      getNum(localSalesData?.local_total?.total_cash) ||
      getNum(localSalesData?.local_list?.total_cash) +
        getNum(localSalesData?.local_paid?.total_cash) +
        getNum(localSalesData?.local_pending?.total_cash) +
        getNum(localSalesData?.local_party?.total_cash);

    const localSalesGpay =
      getNum(localSalesData?.local_total?.total_gpay) ||
      getNum(localSalesData?.local_list?.total_gpay) +
        getNum(localSalesData?.local_paid?.total_gpay) +
        getNum(localSalesData?.local_pending?.total_gpay) +
        getNum(localSalesData?.local_party?.total_gpay);

    const localSalesAccount =
      getNum(localSalesData?.local_total?.total_account) ||
      getNum(localSalesData?.local_list?.total_account) ||
      0;

    const localSalesPending =
      getNum(localSalesData?.local_pending?.total_balance) +
        getNum(localSalesData?.local_party?.total_balance) ||
      Math.max(
        0,
        localSales - (localSalesCash + localSalesGpay + localSalesAccount),
      );

    if (!localSales) {
      localSales =
        localSalesCash +
        localSalesGpay +
        localSalesAccount +
        localSalesPending;
    }

    // 2. GST Sales Extraction
    let gstSales = getNum(gstSalesData?.total_sales);
    if (!gstSales) {
      gstSales =
        getNum(gstSalesData?.total_amount) ||
        getNum(gstSalesData?.total_base) + getNum(gstSalesData?.total_tax) ||
        getNum(gstSalesData?.total_cash) +
          getNum(gstSalesData?.total_gpay) +
          getNum(gstSalesData?.total_account) +
          getNum(gstSalesData?.total_balance);
    }

    const gstSalesCash = getNum(gstSalesData?.total_cash);
    const gstSalesGpay = getNum(gstSalesData?.total_gpay);
    const gstSalesAccount = getNum(gstSalesData?.total_account);
    const gstSalesPending =
      getNum(gstSalesData?.total_balance) ||
      Math.max(0, gstSales - (gstSalesCash + gstSalesGpay + gstSalesAccount));

    if (!gstSales) {
      gstSales =
        gstSalesCash + gstSalesGpay + gstSalesAccount + gstSalesPending;
    }

    // 3. Local Expense Extraction
    let localExpense = getNum(localExpData?.local_expense_total);
    if (!localExpense) {
      localExpense =
        getNum(localExpData?.total_expense) ||
        getNum(localExpData?.total?.total_exp_cash) +
          getNum(localExpData?.total?.total_exp_gpay) +
          getNum(localExpData?.total?.total_exp_account) ||
        getNum(localExpData?.approved?.total_exp_cash) +
          getNum(localExpData?.approved?.total_exp_gpay) +
          getNum(localExpData?.approved?.total_exp_account);
    }

    const localExpenseCash =
      getNum(localExpData?.total?.total_exp_cash) ||
      getNum(localExpData?.approved?.total_exp_cash) ||
      0;

    const localExpenseGpay =
      getNum(localExpData?.total?.total_exp_gpay) ||
      getNum(localExpData?.approved?.total_exp_gpay) ||
      0;

    const localExpenseAccount =
      getNum(localExpData?.total?.total_exp_account) ||
      getNum(localExpData?.approved?.total_exp_account) ||
      0;

    const localExpensePending =
      getNum(localExpData?.total?.total_balance) ||
      getNum(localExpData?.total_balance) ||
      Math.max(
        0,
        localExpense -
          (localExpenseCash + localExpenseGpay + localExpenseAccount),
      );

    if (!localExpense) {
      localExpense =
        localExpenseCash +
        localExpenseGpay +
        localExpenseAccount +
        localExpensePending;
    }

    // 4. GST Expense Extraction
    let gstExpense = getNum(gstExpData?.total_expense);
    if (!gstExpense) {
      gstExpense =
        getNum(gstExpData?.total_amount) ||
        getNum(gstExpData?.total_base) + getNum(gstExpData?.total_tax) ||
        getNum(gstExpData?.total_cash) +
          getNum(gstExpData?.total_gpay) +
          getNum(gstExpData?.total_account) +
          getNum(gstExpData?.total_balance);
    }

    const gstExpenseCash = getNum(gstExpData?.total_cash);
    const gstExpenseGpay = getNum(gstExpData?.total_gpay);
    const gstExpenseAccount = getNum(gstExpData?.total_account);
    const gstExpensePending =
      getNum(gstExpData?.total_balance) ||
      Math.max(
        0,
        gstExpense - (gstExpenseCash + gstExpenseGpay + gstExpenseAccount),
      );

    if (!gstExpense) {
      gstExpense =
        gstExpenseCash +
        gstExpenseGpay +
        gstExpenseAccount +
        gstExpensePending;
    }

    // 5. Office Rent Extraction (strictly from Hub)
    const hubRentList =
      hubRentRes.status === "fulfilled"
        ? hubRentRes.value?.data?.data || hubRentRes.value?.data || []
        : [];

    let rentTotal = 0;
    let rentCash = 0;
    let rentGpay = 0;
    let rentAccount = 0;
    let rentPending = 0;

    hubRentList.forEach((item) => {
      const inst = item.instruction || "";
      if (!isOfficeRent(inst)) return;
      const amt = Number(item.amount || 0);
      if (amt <= 0) return;

      const type = (item.custom_type || "cash").toLowerCase();
      rentTotal += amt;
      if (type === "cash") rentCash += amt;
      else if (type === "gpay") rentGpay += amt;
      else if (type === "account") rentAccount += amt;
      else rentPending += amt;
    });

    // 6. Electric Bill Extraction (from local-expenses and admin-expenses)
    const rawLocalList =
      rawLocalExpRes.status === "fulfilled"
        ? rawLocalExpRes.value?.data?.data ||
          rawLocalExpRes.value?.data ||
          []
        : [];
    const rawAdminList =
      rawAdminExpRes.status === "fulfilled"
        ? rawAdminExpRes.value?.data || rawAdminExpRes.value || []
        : [];

    const allElectricRecords = [];
    const seenElectricIds = new Set();
    [...rawLocalList, ...rawAdminList].forEach((item) => {
      const id = item.documentId || item.id;
      if (id && seenElectricIds.has(id)) return;
      if (id) seenElectricIds.add(id);
      allElectricRecords.push(item);
    });

    let electricTotal = 0;
    let electricCash = 0;
    let electricGpay = 0;
    let electricAccount = 0;
    let electricPending = 0;

    allElectricRecords.forEach((item) => {
      const inst = item.instruction || "";
      if (!isElectricBill(inst)) return;
      const amt = Number(item.amount || 0);
      const isExp =
        (item.method || "expense").toLowerCase() !== "receive";
      if (!isExp || amt <= 0) return;

      const type = (item.custom_type || "cash").toLowerCase();
      electricTotal += amt;
      if (type === "cash") electricCash += amt;
      else if (type === "gpay") electricGpay += amt;
      else if (type === "account") electricAccount += amt;
      else electricPending += amt;
    });

    const totalSales = localSales + gstSales;
    const totalExpense = localExpense + gstExpense;
    const netAmount = totalSales - totalExpense;

    const cash = localSalesCash + gstSalesCash;
    const gpay = localSalesGpay + gstSalesGpay;
    const account = gstSalesAccount + localSalesAccount;

    return {
      localSales,
      localSalesCash,
      localSalesGpay,
      localSalesAccount,
      localSalesPending,

      localExpense,
      localExpenseCash,
      localExpenseGpay,
      localExpenseAccount,
      localExpensePending,

      gstSales,
      gstSalesCash,
      gstSalesGpay,
      gstSalesAccount,
      gstSalesPending,

      gstExpense,
      gstExpenseCash,
      gstExpenseGpay,
      gstExpenseAccount,
      gstExpensePending,

      electricTotal,
      electricCash,
      electricGpay,
      electricAccount,
      electricPending,

      rentTotal,
      rentCash,
      rentGpay,
      rentAccount,
      rentPending,

      cash,
      gpay,
      account,

      totalSales,
      totalExpense,
      netAmount,
    };
  };

  /* -----------------------------------------------------------------
     Main Data Loader Engine
  ------------------------------------------------------------------*/
  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);

    try {
      if (viewMode === "all") {
        // Overall / All-Time (No date filter bounds)
        const overallSummary = await fetchIntervalSummary(null, null);

        // Fetch monthly breakdown in Financial Year sequence (April to March)
        const monthPromises = FY_MONTHS.map(async (mItem) => {
          const yr = selectedYear + mItem.offset;
          const start = dayjs(new Date(yr, mItem.monthIndex, 1))
            .startOf("month")
            .format("YYYY-MM-DD");
          const end = dayjs(new Date(yr, mItem.monthIndex, 1))
            .endOf("month")
            .format("YYYY-MM-DD");
          const summary = await fetchIntervalSummary(start, end);
          return {
            period: mItem.name,
            monthKey: mItem.key,
            ...summary,
          };
        });

        const monthsData = await Promise.all(monthPromises);
        const hasMonthData = monthsData.some(
          (item) => item.totalSales > 0 || item.totalExpense > 0,
        );

        if (hasMonthData) {
          setChartData(monthsData);
        } else {
          setChartData([{ period: "All Time", ...overallSummary }]);
        }

        // Calculate year-wide totals from the 12 months for this year's KPI display
        const yearSums = monthsData.reduce(
          (acc, item) => ({
            electricTotal: acc.electricTotal + item.electricTotal,
            electricCash: acc.electricCash + item.electricCash,
            electricGpay: acc.electricGpay + item.electricGpay,
            electricAccount: acc.electricAccount + item.electricAccount,
            electricPending: acc.electricPending + item.electricPending,

            rentTotal: acc.rentTotal + item.rentTotal,
            rentCash: acc.rentCash + item.rentCash,
            rentGpay: acc.rentGpay + item.rentGpay,
            rentAccount: acc.rentAccount + item.rentAccount,
            rentPending: acc.rentPending + item.rentPending,
          }),
          {
            electricTotal: 0,
            electricCash: 0,
            electricGpay: 0,
            electricAccount: 0,
            electricPending: 0,
            rentTotal: 0,
            rentCash: 0,
            rentGpay: 0,
            rentAccount: 0,
            rentPending: 0,
          },
        );

        setSummaryTotals({
          ...overallSummary,
          ...yearSums,
        });
      } else if (viewMode === "month") {
        // Month-wise aggregation for selectedYear in Financial Year sequence (April to March)
        const monthPromises = FY_MONTHS.map(async (mItem) => {
          const yr = selectedYear + mItem.offset;
          const start = dayjs(new Date(yr, mItem.monthIndex, 1))
            .startOf("month")
            .format("YYYY-MM-DD");
          const end = dayjs(new Date(yr, mItem.monthIndex, 1))
            .endOf("month")
            .format("YYYY-MM-DD");
          const summary = await fetchIntervalSummary(start, end);
          return {
            period: mItem.name,
            monthKey: mItem.key,
            ...summary,
          };
        });

        const monthsData = await Promise.all(monthPromises);

        // Filter by selected month if not 'all'
        const filteredMonths =
          selectedMonth === "all"
            ? monthsData
            : monthsData.filter((item) => item.monthKey === selectedMonth);

        setChartData(filteredMonths);

        // Overarching totals for the selected year
        const totals = monthsData.reduce(
          (acc, item) => ({
            localSales: acc.localSales + item.localSales,
            localSalesCash: acc.localSalesCash + item.localSalesCash,
            localSalesGpay: acc.localSalesGpay + item.localSalesGpay,
            localSalesAccount: acc.localSalesAccount + item.localSalesAccount,
            localSalesPending: acc.localSalesPending + item.localSalesPending,

            localExpense: acc.localExpense + item.localExpense,
            localExpenseCash: acc.localExpenseCash + item.localExpenseCash,
            localExpenseGpay: acc.localExpenseGpay + item.localExpenseGpay,
            localExpenseAccount:
              acc.localExpenseAccount + item.localExpenseAccount,
            localExpensePending:
              acc.localExpensePending + item.localExpensePending,

            gstSales: acc.gstSales + item.gstSales,
            gstSalesCash: acc.gstSalesCash + item.gstSalesCash,
            gstSalesGpay: acc.gstSalesGpay + item.gstSalesGpay,
            gstSalesAccount: acc.gstSalesAccount + item.gstSalesAccount,
            gstSalesPending: acc.gstSalesPending + item.gstSalesPending,

            gstExpense: acc.gstExpense + item.gstExpense,
            gstExpenseCash: acc.gstExpenseCash + item.gstExpenseCash,
            gstExpenseGpay: acc.gstExpenseGpay + item.gstExpenseGpay,
            gstExpenseAccount:
              acc.gstExpenseAccount + item.gstExpenseAccount,
            gstExpensePending:
              acc.gstExpensePending + item.gstExpensePending,

            electricTotal: acc.electricTotal + item.electricTotal,
            electricCash: acc.electricCash + item.electricCash,
            electricGpay: acc.electricGpay + item.electricGpay,
            electricAccount: acc.electricAccount + item.electricAccount,
            electricPending: acc.electricPending + item.electricPending,

            rentTotal: acc.rentTotal + item.rentTotal,
            rentCash: acc.rentCash + item.rentCash,
            rentGpay: acc.rentGpay + item.rentGpay,
            rentAccount: acc.rentAccount + item.rentAccount,
            rentPending: acc.rentPending + item.rentPending,

            cash: acc.cash + item.cash,
            gpay: acc.gpay + item.gpay,
            account: acc.account + item.account,

            totalSales: acc.totalSales + item.totalSales,
            totalExpense: acc.totalExpense + item.totalExpense,
            netAmount: acc.netAmount + item.netAmount,
          }),
          {
            localSales: 0,
            localSalesCash: 0,
            localSalesGpay: 0,
            localSalesAccount: 0,
            localSalesPending: 0,
            localExpense: 0,
            localExpenseCash: 0,
            localExpenseGpay: 0,
            localExpenseAccount: 0,
            localExpensePending: 0,
            gstSales: 0,
            gstSalesCash: 0,
            gstSalesGpay: 0,
            gstSalesAccount: 0,
            gstSalesPending: 0,
            gstExpense: 0,
            gstExpenseCash: 0,
            gstExpenseGpay: 0,
            gstExpenseAccount: 0,
            gstExpensePending: 0,
            electricTotal: 0,
            electricCash: 0,
            electricGpay: 0,
            electricAccount: 0,
            electricPending: 0,
            rentTotal: 0,
            rentCash: 0,
            rentGpay: 0,
            rentAccount: 0,
            rentPending: 0,
            cash: 0,
            gpay: 0,
            account: 0,
            totalSales: 0,
            totalExpense: 0,
            netAmount: 0,
          },
        );

        setSummaryTotals(totals);
      } else if (viewMode === "year") {
        // Year-wise aggregation across the available years
        const sortedYears = [...AVAILABLE_YEARS].sort((a, b) => a - b);
        const yearPromises = sortedYears.map(async (yr) => {
          const start = `${yr}-04-01`;
          const end = `${yr + 1}-03-31`;
          const summary = await fetchIntervalSummary(start, end);
          return {
            period: `FY ${yr}-${(yr + 1).toString().slice(2)}`,
            ...summary,
          };
        });

        const yearsData = await Promise.all(yearPromises);
        setChartData(yearsData);

        const totals = yearsData.reduce(
          (acc, item) => ({
            localSales: acc.localSales + item.localSales,
            localSalesCash: acc.localSalesCash + item.localSalesCash,
            localSalesGpay: acc.localSalesGpay + item.localSalesGpay,
            localSalesAccount: acc.localSalesAccount + item.localSalesAccount,
            localSalesPending: acc.localSalesPending + item.localSalesPending,

            localExpense: acc.localExpense + item.localExpense,
            localExpenseCash: acc.localExpenseCash + item.localExpenseCash,
            localExpenseGpay: acc.localExpenseGpay + item.localExpenseGpay,
            localExpenseAccount:
              acc.localExpenseAccount + item.localExpenseAccount,
            localExpensePending:
              acc.localExpensePending + item.localExpensePending,

            gstSales: acc.gstSales + item.gstSales,
            gstSalesCash: acc.gstSalesCash + item.gstSalesCash,
            gstSalesGpay: acc.gstSalesGpay + item.gstSalesGpay,
            gstSalesAccount: acc.gstSalesAccount + item.gstSalesAccount,
            gstSalesPending: acc.gstSalesPending + item.gstSalesPending,

            gstExpense: acc.gstExpense + item.gstExpense,
            gstExpenseCash: acc.gstExpenseCash + item.gstExpenseCash,
            gstExpenseGpay: acc.gstExpenseGpay + item.gstExpenseGpay,
            gstExpenseAccount:
              acc.gstExpenseAccount + item.gstExpenseAccount,
            gstExpensePending:
              acc.gstExpensePending + item.gstExpensePending,

            electricTotal: acc.electricTotal + item.electricTotal,
            electricCash: acc.electricCash + item.electricCash,
            electricGpay: acc.electricGpay + item.electricGpay,
            electricAccount: acc.electricAccount + item.electricAccount,
            electricPending: acc.electricPending + item.electricPending,

            rentTotal: acc.rentTotal + item.rentTotal,
            rentCash: acc.rentCash + item.rentCash,
            rentGpay: acc.rentGpay + item.rentGpay,
            rentAccount: acc.rentAccount + item.rentAccount,
            rentPending: acc.rentPending + item.rentPending,

            cash: acc.cash + item.cash,
            gpay: acc.gpay + item.gpay,
            account: acc.account + item.account,

            totalSales: acc.totalSales + item.totalSales,
            totalExpense: acc.totalExpense + item.totalExpense,
            netAmount: acc.netAmount + item.netAmount,
          }),
          {
            localSales: 0,
            localSalesCash: 0,
            localSalesGpay: 0,
            localSalesAccount: 0,
            localSalesPending: 0,
            localExpense: 0,
            localExpenseCash: 0,
            localExpenseGpay: 0,
            localExpenseAccount: 0,
            localExpensePending: 0,
            gstSales: 0,
            gstSalesCash: 0,
            gstSalesGpay: 0,
            gstSalesAccount: 0,
            gstSalesPending: 0,
            gstExpense: 0,
            gstExpenseCash: 0,
            gstExpenseGpay: 0,
            gstExpenseAccount: 0,
            gstExpensePending: 0,
            electricTotal: 0,
            electricCash: 0,
            electricGpay: 0,
            electricAccount: 0,
            electricPending: 0,
            rentTotal: 0,
            rentCash: 0,
            rentGpay: 0,
            rentAccount: 0,
            rentPending: 0,
            cash: 0,
            gpay: 0,
            account: 0,
            totalSales: 0,
            totalExpense: 0,
            netAmount: 0,
          },
        );

        setSummaryTotals(totals);
      } else if (viewMode === "custom") {
        // Custom Date Range aggregation
        const { shouldFetch, from, to } = resolveApiDateRange(
          fromDate,
          toDate,
          fyFromDate,
          fyToDate,
        );

        if (!shouldFetch) {
          return;
        }

        const summary = await fetchIntervalSummary(from, to);
        const label =
          from && to
            ? `${dayjs(from).format("DD/MM/YY")} – ${dayjs(to).format("DD/MM/YY")}`
            : "Selected Period";

        setChartData([{ period: label, ...summary }]);
        setSummaryTotals(summary);
      }
    } catch (error) {
      console.error("Analytics data load failed:", error);
    } finally {
      setLoading(false);
    }
  }, [
    viewMode,
    selectedYear,
    selectedMonth,
    fromDate,
    toDate,
    fyFromDate,
    fyToDate,
  ]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const profitMarginPercent = useMemo(() => {
    if (!summaryTotals.totalSales) return 0;
    return (
      (summaryTotals.netAmount / summaryTotals.totalSales) *
      100
    ).toFixed(1);
  }, [summaryTotals]);

  return (
    <MainLayout>
      <div className="min-h-full bg-slate-50/50 pb-12">
        {/* ================= HEADER & FILTER TOOLBAR ================= */}
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-5 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 shadow-inner">
                <ChartIcon width="22" height="22" color="#4F46E5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Analytics & Financial Insights
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Interactive visualization of sales, expenses, electric bills, and rent
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-slate-200/70 p-1">
              <button
                type="button"
                onClick={() => setViewMode("all")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  viewMode === "all"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Time (Overall)
              </button>
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  viewMode === "month"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Month-wise
              </button>
              <button
                type="button"
                onClick={() => setViewMode("year")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  viewMode === "year"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Year-wise
              </button>
              <button
                type="button"
                onClick={() => setViewMode("custom")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  viewMode === "custom"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Custom Range
              </button>
            </div>

            <button
              type="button"
              onClick={loadAnalyticsData}
              disabled={loading}
              title="Refresh Analytics"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshIcon
                width="16"
                height="16"
                className={loading ? "animate-spin text-indigo-600" : ""}
              />
            </button>
          </div>
        </div>

        {/* ================= SECONDARY FILTER CONTROLS ================= */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {viewMode === "all" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Financial Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none transition hover:bg-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  {AVAILABLE_YEARS.map((yr) => (
                    <option key={yr} value={yr}>
                      FY {yr} – {yr + 1}
                    </option>
                  ))}
                </select>
                <span className="text-xs font-medium text-slate-400">
                  (Showing April to March monthly progression)
                </span>
              </div>
            )}

            {viewMode === "month" && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Financial Year:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none transition hover:bg-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    {AVAILABLE_YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        FY {yr} – {yr + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Month:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) =>
                      setSelectedMonth(
                        e.target.value === "all" ? "all" : Number(e.target.value),
                      )
                    }
                    className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none transition hover:bg-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">All 12 Months (Apr – Mar)</option>
                    {FY_MONTHS.map((mItem) => (
                      <option key={mItem.key} value={mItem.key}>
                        {mItem.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {viewMode === "year" && (
              <span className="text-xs font-medium text-slate-500">
                Displaying Multi-Year Historical Performance ({AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]} – {AVAILABLE_YEARS[0]})
              </span>
            )}

            {viewMode === "custom" && (
              <div className="flex items-center gap-2">
                <Datepicker
                  type="multipleDatePicker"
                  FromDate={fromDate}
                  ToDate={toDate}
                  setFromDate={setFromDate}
                  setToDate={setToDate}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            {loading ? (
              <span className="flex items-center gap-1.5 text-indigo-600 font-semibold">
                <span className="h-2 w-2 animate-ping rounded-full bg-indigo-600" />
                Aggregating live records…
              </span>
            ) : (
              <span>Calculations updated live</span>
            )}
          </div>
        </div>

        {/* ================= EXECUTIVE SUMMARY KPI CARDS ================= */}
        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Total Sales Card */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30 p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Total Sales
              </span>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                Income
              </span>
            </div>
            <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
              ₹ {formatINR(summaryTotals.totalSales)}
            </h3>
            <div className="mt-4 flex items-center justify-between border-t border-emerald-100/80 pt-3 text-xs">
              <div className="text-slate-600">
                <span className="font-medium text-slate-400">Local: </span>
                <span className="font-semibold text-emerald-800">
                  ₹ {formatCompactINR(summaryTotals.localSales)}
                </span>
              </div>
              <div className="text-slate-600">
                <span className="font-medium text-slate-400">GST: </span>
                <span className="font-semibold text-emerald-800">
                  ₹ {formatCompactINR(summaryTotals.gstSales)}
                </span>
              </div>
            </div>
          </div>

          {/* Total Expenses Card */}
          <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-gradient-to-br from-white to-rose-50/30 p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                Total Expense
              </span>
              <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                Spent
              </span>
            </div>
            <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
              ₹ {formatINR(summaryTotals.totalExpense)}
            </h3>
            <div className="mt-4 flex items-center justify-between border-t border-rose-100/80 pt-3 text-xs">
              <div className="text-slate-600">
                <span className="font-medium text-slate-400">Local: </span>
                <span className="font-semibold text-rose-800">
                  ₹ {formatCompactINR(summaryTotals.localExpense)}
                </span>
              </div>
              <div className="text-slate-600">
                <span className="font-medium text-slate-400">GST: </span>
                <span className="font-semibold text-rose-800">
                  ₹ {formatCompactINR(summaryTotals.gstExpense)}
                </span>
              </div>
            </div>
          </div>

          {/* Net Profit Card */}
          <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                Net Profit
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                  summaryTotals.netAmount >= 0
                    ? "bg-indigo-100 text-indigo-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {profitMarginPercent}% Margin
              </span>
            </div>
            <h3
              className={`mt-2 text-2xl font-extrabold tracking-tight ${
                summaryTotals.netAmount >= 0 ? "text-indigo-900" : "text-red-600"
              }`}
            >
              ₹ {formatINR(summaryTotals.netAmount)}
            </h3>
            <div className="mt-4 flex items-center justify-between border-t border-indigo-100/80 pt-3 text-xs text-slate-500">
              <span>Sales – Total Expenses</span>
              <span
                className={`font-semibold ${
                  summaryTotals.netAmount >= 0
                    ? "text-indigo-600"
                    : "text-red-500"
                }`}
              >
                {summaryTotals.netAmount >= 0 ? "Profitable" : "Deficit"}
              </span>
            </div>
          </div>
        </div>

        {/* ================= PRIMARY SALES VS EXPENSE CHARTS ================= */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Local Sales vs Local Expense Chart */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Local Sales vs Local Expense
                </h2>
                <p className="text-xs text-slate-400">
                  Direct comparison of local sales revenue vs. local expenditures (April – March)
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-emerald-500" /> Local Sales
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-rose-500" /> Local Expense
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No local transaction data available for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis
                      dataKey="period"
                      stroke="#94A3B8"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={11}
                      tickFormatter={formatCompactINR}
                      tickLine={false}
                    />
                    <Tooltip content={<LocalChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar
                      dataKey="localSales"
                      name="Local Sales"
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    />
                    <Bar
                      dataKey="localExpense"
                      name="Local Expense"
                      fill="#F43F5E"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* GST Sales vs GST Expense Chart */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  GST Sales vs GST Expense
                </h2>
                <p className="text-xs text-slate-400">
                  Direct comparison of GST-registered sales vs. GST expenditures (April – March)
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-emerald-600" /> GST Sales
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-rose-600" /> GST Expense
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No GST transaction data available for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis
                      dataKey="period"
                      stroke="#94A3B8"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={11}
                      tickFormatter={formatCompactINR}
                      tickLine={false}
                    />
                    <Tooltip content={<GstChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar
                      dataKey="gstSales"
                      name="GST Sales"
                      fill="#059669"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    />
                    <Bar
                      dataKey="gstExpense"
                      name="GST Expense"
                      fill="#E11D48"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ================= OPERATIONAL & FACILITY EXPENSE CHARTS (ELECTRIC BILL & OFFICE RENT - HUB) ================= */}
        <div className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Operational & Facility Expenses
            </h2>
            <p className="text-xs text-slate-400">
              Month-wise breakdown (April to March) with annual year-level totals for Electric Bills and Hub Office Rent
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Electric Bill Chart (Month-wise April to March with Top-Left Year-wise Total) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Electric Bill
                    </h3>
                    <span className="rounded-lg bg-amber-100/80 px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-200">
                      FY {selectedYear}–{(selectedYear + 1).toString().slice(2)} Total: ₹ {formatINR(summaryTotals.electricTotal)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Month-wise electricity expenditure tracking (April – March)
                  </p>
                </div>
              </div>

              {/* Sub-channel breakdown chips for the year */}
              <div className="mb-4 flex flex-wrap items-center gap-3 border-y border-slate-100 py-2.5 text-xs">
                <span className="text-[11px] font-medium text-slate-400">
                  FY {selectedYear}–{(selectedYear + 1).toString().slice(2)} Breakdown:
                </span>
                <span className="font-semibold text-slate-700">
                  Cash: <span className="text-emerald-700">₹ {formatCompactINR(summaryTotals.electricCash)}</span>
                </span>
                <span className="font-semibold text-slate-700">
                  GPay: <span className="text-blue-700">₹ {formatCompactINR(summaryTotals.electricGpay)}</span>
                </span>
                <span className="font-semibold text-slate-700">
                  Account: <span className="text-purple-700">₹ {formatCompactINR(summaryTotals.electricAccount)}</span>
                </span>
                {summaryTotals.electricPending > 0 && (
                  <span className="font-semibold text-slate-700">
                    Pending: <span className="text-amber-700">₹ {formatCompactINR(summaryTotals.electricPending)}</span>
                  </span>
                )}
              </div>

              <div className="h-72 w-full">
                {chartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    No electric bill records found for this period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis
                        dataKey="period"
                        stroke="#94A3B8"
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#94A3B8"
                        fontSize={11}
                        tickFormatter={formatCompactINR}
                        tickLine={false}
                      />
                      <Tooltip content={<ElectricChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar
                        dataKey="electricTotal"
                        name="Electric Bill"
                        fill="#F59E0B"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={38}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Office Rent Chart (Hub only - Month-wise April to March with Top-Left Year-wise Total) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Office Rent
                    </h3>
                    <span className="rounded-lg bg-indigo-100/80 px-2.5 py-1 text-xs font-bold text-indigo-900 border border-indigo-200">
                      FY {selectedYear}–{(selectedYear + 1).toString().slice(2)} Total: ₹ {formatINR(summaryTotals.rentTotal)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Month-wise facility rent payments (Hub only, April – March)
                  </p>
                </div>
              </div>

              {/* Sub-channel breakdown chips for the year */}
              <div className="mb-4 flex flex-wrap items-center gap-3 border-y border-slate-100 py-2.5 text-xs">
                <span className="text-[11px] font-medium text-slate-400">
                  FY {selectedYear}–{(selectedYear + 1).toString().slice(2)} Breakdown:
                </span>
                <span className="font-semibold text-slate-700">
                  Cash: <span className="text-emerald-700">₹ {formatCompactINR(summaryTotals.rentCash)}</span>
                </span>
                <span className="font-semibold text-slate-700">
                  GPay: <span className="text-blue-700">₹ {formatCompactINR(summaryTotals.rentGpay)}</span>
                </span>
                <span className="font-semibold text-slate-700">
                  Account: <span className="text-purple-700">₹ {formatCompactINR(summaryTotals.rentAccount)}</span>
                </span>
                {summaryTotals.rentPending > 0 && (
                  <span className="font-semibold text-slate-700">
                    Pending: <span className="text-amber-700">₹ {formatCompactINR(summaryTotals.rentPending)}</span>
                  </span>
                )}
              </div>

              <div className="h-72 w-full">
                {chartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    No office rent records found in Hub.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis
                        dataKey="period"
                        stroke="#94A3B8"
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#94A3B8"
                        fontSize={11}
                        tickFormatter={formatCompactINR}
                        tickLine={false}
                      />
                      <Tooltip content={<RentChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar
                        dataKey="rentTotal"
                        name="Office Rent"
                        fill="#6366F1"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={38}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= DETAILED FINANCIAL BREAKDOWN TABLE ================= */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">
              Financial Breakdown Data Matrix
            </h2>
            <p className="text-xs text-slate-400">
              Period-wise accounting matrix with sales, expenses, net profit, payment channels, and pending balances (April – March)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Period</th>
                  <th className="py-3.5 px-4 font-semibold">Local Sales</th>
                  <th className="py-3.5 px-4 font-semibold">GST Sales</th>
                  <th className="py-3.5 px-4 font-semibold text-emerald-800">
                    Total Sales
                  </th>
                  <th className="py-3.5 px-4 font-semibold">Local Expense</th>
                  <th className="py-3.5 px-4 font-semibold">GST Expense</th>
                  <th className="py-3.5 px-4 font-semibold text-rose-800">
                    Total Expense
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-indigo-800">
                    Net Profit
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-emerald-700">Cash</th>
                  <th className="py-3.5 px-4 font-semibold text-blue-700">GPay</th>
                  <th className="py-3.5 px-4 font-semibold text-purple-700">Account</th>
                  <th className="py-3.5 px-4 font-semibold text-amber-700">Local Need to Get</th>
                  <th className="py-3.5 px-4 font-semibold text-amber-700">GST Need to Get</th>
                  <th className="py-3.5 px-4 font-semibold text-rose-700">GST Need to Pay</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {chartData.map((row, idx) => (
                  <tr
                    key={idx}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {row.period}
                    </td>
                    <td className="py-3 px-4">₹ {formatINR(row.localSales)}</td>
                    <td className="py-3 px-4">₹ {formatINR(row.gstSales)}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      ₹ {formatINR(row.totalSales)}
                    </td>
                    <td className="py-3 px-4">
                      ₹ {formatINR(row.localExpense)}
                    </td>
                    <td className="py-3 px-4">₹ {formatINR(row.gstExpense)}</td>
                    <td className="py-3 px-4 font-bold text-rose-700">
                      ₹ {formatINR(row.totalExpense)}
                    </td>
                    <td
                      className={`py-3 px-4 font-bold ${
                        row.netAmount >= 0 ? "text-indigo-700" : "text-red-600"
                      }`}
                    >
                      ₹ {formatINR(row.netAmount)}
                    </td>
                    <td className="py-3 px-4 font-medium text-emerald-700">
                      ₹ {formatINR(row.cash)}
                    </td>
                    <td className="py-3 px-4 font-medium text-blue-700">
                      ₹ {formatINR(row.gpay)}
                    </td>
                    <td className="py-3 px-4 font-medium text-purple-700">
                      ₹ {formatINR(row.account)}
                    </td>
                    <td className="py-3 px-4 font-medium text-amber-700">
                      ₹ {formatINR(row.localSalesPending)}
                    </td>
                    <td className="py-3 px-4 font-medium text-amber-700">
                      ₹ {formatINR(row.gstSalesPending)}
                    </td>
                    <td className="py-3 px-4 font-medium text-rose-700">
                      ₹ {formatINR(row.gstExpensePending)}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                <tr>
                  <td className="py-3.5 px-4 uppercase tracking-wider text-slate-500">
                    Summary Total
                  </td>
                  <td className="py-3.5 px-4">
                    ₹ {formatINR(summaryTotals.localSales)}
                  </td>
                  <td className="py-3.5 px-4">
                    ₹ {formatINR(summaryTotals.gstSales)}
                  </td>
                  <td className="py-3.5 px-4 text-emerald-800">
                    ₹ {formatINR(summaryTotals.totalSales)}
                  </td>
                  <td className="py-3.5 px-4">
                    ₹ {formatINR(summaryTotals.localExpense)}
                  </td>
                  <td className="py-3.5 px-4">
                    ₹ {formatINR(summaryTotals.gstExpense)}
                  </td>
                  <td className="py-3.5 px-4 text-rose-800">
                    ₹ {formatINR(summaryTotals.totalExpense)}
                  </td>
                  <td
                    className={`py-3.5 px-4 ${
                      summaryTotals.netAmount >= 0
                        ? "text-indigo-800"
                        : "text-red-600"
                    }`}
                  >
                    ₹ {formatINR(summaryTotals.netAmount)}
                  </td>
                  <td className="py-3.5 px-4 text-emerald-800">
                    ₹ {formatINR(summaryTotals.cash)}
                  </td>
                  <td className="py-3.5 px-4 text-blue-800">
                    ₹ {formatINR(summaryTotals.gpay)}
                  </td>
                  <td className="py-3.5 px-4 text-purple-800">
                    ₹ {formatINR(summaryTotals.account)}
                  </td>
                  <td className="py-3.5 px-4 text-amber-800">
                    ₹ {formatINR(summaryTotals.localSalesPending)}
                  </td>
                  <td className="py-3.5 px-4 text-amber-800">
                    ₹ {formatINR(summaryTotals.gstSalesPending)}
                  </td>
                  <td className="py-3.5 px-4 text-rose-800">
                    ₹ {formatINR(summaryTotals.gstExpensePending)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Analytics;
