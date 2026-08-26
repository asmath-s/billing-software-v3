import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getGstExpenseSummary } from "../../api/gstExpense";
import { getGstSalesSummary } from "../../api/gstList";
import { getLocalAmounts } from "../../api/localAmount";
import { getLocalExpenseAmounts } from "../../api/localExpense";
import Datepicker from "../../components/Datepicker/Datepicker";
import {
  AccountIcon,
  CashIcon,
  ChartIcon,
  GpayIcon,
  RefreshIcon,
} from "../../components/icons";
import MainLayout from "../../layouts/MainLayout";

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

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const AVAILABLE_YEARS = [2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020];

/* -----------------------------------------------------------------
   Custom Tooltip Component
------------------------------------------------------------------*/
const CustomChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div
            key={`item-${index}`}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color || entry.fill }}
              />
              <span className="font-medium text-slate-600">{entry.name}:</span>
            </div>
            <span className="font-bold text-slate-900">
              ₹ {formatINR(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* -----------------------------------------------------------------
   Payment Donut Tooltip Component
------------------------------------------------------------------*/
const PaymentTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: data.payload.color }}
        />
        <span className="text-xs font-semibold text-slate-700">
          {data.name}
        </span>
      </div>
      <p className="mt-1 text-sm font-bold text-slate-900">
        ₹ {formatINR(data.value)}
      </p>
      <p className="text-[11px] text-slate-400">
        {data.payload.percentage}% of total collections
      </p>
    </div>
  );
};

/* -----------------------------------------------------------------
   Analytics Page Component
------------------------------------------------------------------*/
const Analytics = () => {
  const currentYear = new Date().getFullYear();

  // Filters State
  const [viewMode, setViewMode] = useState("all"); // 'all' | 'month' | 'year' | 'custom'
  const [selectedYear, setSelectedYear] = useState(
    AVAILABLE_YEARS.includes(currentYear) ? currentYear : 2026,
  );
  const [selectedMonth, setSelectedMonth] = useState("all"); // 'all' or 0..11
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [loading, setLoading] = useState(false);

  // Aggregated Data
  const [chartData, setChartData] = useState([]);
  const [summaryTotals, setSummaryTotals] = useState({
    localSales: 0,
    gstSales: 0,
    totalSales: 0,
    localExpense: 0,
    gstExpense: 0,
    totalExpense: 0,
    netAmount: 0,
    cash: 0,
    gpay: 0,
    account: 0,
    totalReceived: 0,
  });

  /* -----------------------------------------------------------------
     Fetch summary helper for any date interval
  ------------------------------------------------------------------*/
  const fetchIntervalSummary = async (fromStr = null, toStr = null) => {
    const dateQuery =
      fromStr && toStr ? `?fromDate=${fromStr}&toDate=${toStr}` : "";

    const [localSalesRes, gstSalesRes, localExpRes, gstExpRes] =
      await Promise.allSettled([
        getLocalAmounts(dateQuery),
        getGstSalesSummary(dateQuery),
        getLocalExpenseAmounts(dateQuery),
        getGstExpenseSummary(dateQuery),
      ]);

    const localSalesData =
      localSalesRes.status === "fulfilled" ? localSalesRes.value : {};
    const gstSalesData =
      gstSalesRes.status === "fulfilled" ? gstSalesRes.value : {};
    const localExpData =
      localExpRes.status === "fulfilled" ? localExpRes.value : {};
    const gstExpData =
      gstExpRes.status === "fulfilled" ? gstExpRes.value : {};

    // 1. Local Sales Extraction (matches Dashboard sales_total)
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

    // 2. GST Sales Extraction (matches Dashboard total_sales)
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

    // 3. Local Expense Extraction (matches Dashboard local_expense_total)
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

    // 4. GST Expense Extraction (matches Dashboard total_expense)
    let gstExpense = getNum(gstExpData?.total_expense);
    if (!gstExpense) {
      gstExpense =
        getNum(gstExpData?.total_amount) ||
        getNum(gstExpData?.total_base) + getNum(gstExpData?.total_tax) ||
        getNum(gstExpData?.total_cash) +
          getNum(gstExpData?.total_gpay) +
          getNum(gstExpData?.total_account);
    }

    const totalSales = localSales + gstSales;
    const totalExpense = localExpense + gstExpense;
    const netAmount = totalSales - totalExpense;

    const cash = localSalesCash + gstSalesCash;
    const gpay = localSalesGpay + gstSalesGpay;
    const account = gstSalesAccount;
    const totalReceived = cash + gpay + account;

    return {
      localSales,
      gstSales,
      totalSales,
      localExpense,
      gstExpense,
      totalExpense,
      netAmount,
      cash,
      gpay,
      account,
      totalReceived,
    };
  };

  /* -----------------------------------------------------------------
     Main Data Loader Engine
  ------------------------------------------------------------------*/
  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);

    try {
      if (viewMode === "all") {
        // Overall / All-Time (No date filter bounds - matches default Dashboard)
        const overallSummary = await fetchIntervalSummary(null, null);

        // Also fetch monthly breakdown for current year so chart has visual data
        const monthPromises = Array.from({ length: 12 }, async (_, m) => {
          const start = dayjs(new Date(selectedYear, m, 1)).format(
            "YYYY-MM-DD",
          );
          const end = dayjs(new Date(selectedYear, m + 1, 0)).format(
            "YYYY-MM-DD",
          );
          const summary = await fetchIntervalSummary(start, end);
          return {
            period: MONTH_NAMES[m],
            monthIndex: m,
            ...summary,
          };
        });

        const monthsData = await Promise.all(monthPromises);
        const hasMonthData = monthsData.some((item) => item.totalSales > 0 || item.totalExpense > 0);

        if (hasMonthData) {
          setChartData(monthsData);
        } else {
          setChartData([{ period: "All Time", ...overallSummary }]);
        }

        setSummaryTotals(overallSummary);
      } else if (viewMode === "month") {
        // Month-wise aggregation for selectedYear (Jan to Dec)
        const monthPromises = Array.from({ length: 12 }, async (_, m) => {
          const start = dayjs(new Date(selectedYear, m, 1)).format(
            "YYYY-MM-DD",
          );
          const end = dayjs(new Date(selectedYear, m + 1, 0)).format(
            "YYYY-MM-DD",
          );
          const summary = await fetchIntervalSummary(start, end);
          return {
            period: MONTH_NAMES[m],
            monthIndex: m,
            ...summary,
          };
        });

        const monthsData = await Promise.all(monthPromises);

        // Filter by selected month if not 'all'
        const filteredMonths =
          selectedMonth === "all"
            ? monthsData
            : monthsData.filter((item) => item.monthIndex === selectedMonth);

        setChartData(filteredMonths);

        // Compute overarching totals for the selected year/months
        const totals = monthsData.reduce(
          (acc, item) => ({
            localSales: acc.localSales + item.localSales,
            gstSales: acc.gstSales + item.gstSales,
            totalSales: acc.totalSales + item.totalSales,
            localExpense: acc.localExpense + item.localExpense,
            gstExpense: acc.gstExpense + item.gstExpense,
            totalExpense: acc.totalExpense + item.totalExpense,
            netAmount: acc.netAmount + item.netAmount,
            cash: acc.cash + item.cash,
            gpay: acc.gpay + item.gpay,
            account: acc.account + item.account,
            totalReceived: acc.totalReceived + item.totalReceived,
          }),
          {
            localSales: 0,
            gstSales: 0,
            totalSales: 0,
            localExpense: 0,
            gstExpense: 0,
            totalExpense: 0,
            netAmount: 0,
            cash: 0,
            gpay: 0,
            account: 0,
            totalReceived: 0,
          },
        );

        setSummaryTotals(totals);
      } else if (viewMode === "year") {
        // Year-wise aggregation across the available years
        const sortedYears = [...AVAILABLE_YEARS].sort((a, b) => a - b);
        const yearPromises = sortedYears.map(async (yr) => {
          const start = `${yr}-01-01`;
          const end = `${yr}-12-31`;
          const summary = await fetchIntervalSummary(start, end);
          return {
            period: `${yr}`,
            ...summary,
          };
        });

        const yearsData = await Promise.all(yearPromises);
        setChartData(yearsData);

        const totals = yearsData.reduce(
          (acc, item) => ({
            localSales: acc.localSales + item.localSales,
            gstSales: acc.gstSales + item.gstSales,
            totalSales: acc.totalSales + item.totalSales,
            localExpense: acc.localExpense + item.localExpense,
            gstExpense: acc.gstExpense + item.gstExpense,
            totalExpense: acc.totalExpense + item.totalExpense,
            netAmount: acc.netAmount + item.netAmount,
            cash: acc.cash + item.cash,
            gpay: acc.gpay + item.gpay,
            account: acc.account + item.account,
            totalReceived: acc.totalReceived + item.totalReceived,
          }),
          {
            localSales: 0,
            gstSales: 0,
            totalSales: 0,
            localExpense: 0,
            gstExpense: 0,
            totalExpense: 0,
            netAmount: 0,
            cash: 0,
            gpay: 0,
            account: 0,
            totalReceived: 0,
          },
        );

        setSummaryTotals(totals);
      } else if (viewMode === "custom") {
        // Custom Date Range aggregation
        const start = fromDate ? dayjs(fromDate).format("YYYY-MM-DD") : null;
        const end = toDate ? dayjs(toDate).format("YYYY-MM-DD") : null;

        const summary = await fetchIntervalSummary(start, end);
        const label =
          start && end
            ? `${dayjs(start).format("DD/MM/YY")} – ${dayjs(end).format("DD/MM/YY")}`
            : "Selected Period";

        setChartData([{ period: label, ...summary }]);
        setSummaryTotals(summary);
      }
    } catch (error) {
      console.error("Analytics data load failed:", error);
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedYear, selectedMonth, fromDate, toDate]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  /* -----------------------------------------------------------------
     Payment Breakdown Donut Data
  ------------------------------------------------------------------*/
  const paymentDonutData = useMemo(() => {
    const total = summaryTotals.totalReceived || 0;
    const cashShare =
      total > 0 ? Math.round((summaryTotals.cash / total) * 100) : 0;
    const gpayShare =
      total > 0 ? Math.round((summaryTotals.gpay / total) * 100) : 0;
    const accShare =
      total > 0 ? Math.round((summaryTotals.account / total) * 100) : 0;

    return [
      {
        name: "Cash",
        value: summaryTotals.cash,
        percentage: cashShare,
        color: "#10B981", // Emerald
      },
      {
        name: "GPay",
        value: summaryTotals.gpay,
        percentage: gpayShare,
        color: "#3B82F6", // Blue
      },
      {
        name: "Account",
        value: summaryTotals.account,
        percentage: accShare,
        color: "#8B5CF6", // Purple
      },
    ].filter((item) => item.value > 0);
  }, [summaryTotals]);

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
              Interactive visualization of sales, expenses, net profits, and payment channels
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
              <span className="text-xs font-medium text-slate-600">
                Displaying All-Time Cumulative Accounting Totals
              </span>
            )}

            {viewMode === "month" && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Year:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none transition hover:bg-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    {AVAILABLE_YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
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
                    <option value="all">All 12 Months</option>
                    {MONTH_NAMES.map((name, i) => (
                      <option key={name} value={i}>
                        {name}
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
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                Total Expenses
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
                Net Profit / Margin
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

          {/* Total Collections Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Total Collections
              </span>
              <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-800">
                Received
              </span>
            </div>
            <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
              ₹ {formatINR(summaryTotals.totalReceived)}
            </h3>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-[11px]">
              <div className="flex items-center gap-1 text-emerald-700 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Cash: {formatCompactINR(summaryTotals.cash)}</span>
              </div>
              <div className="flex items-center gap-1 text-blue-700 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <span>GPay: {formatCompactINR(summaryTotals.gpay)}</span>
              </div>
              <div className="flex items-center gap-1 text-purple-700 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                <span>Acc: {formatCompactINR(summaryTotals.account)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= PRIMARY CHART SECTION: SALES VS EXPENSES ================= */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Composed Chart: Sales vs Expense & Net Trend */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Sales vs. Expenses & Profit Trend
                </h2>
                <p className="text-xs text-slate-400">
                  Comparison of total sales generated versus operational expenditures
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-emerald-500" /> Total Sales
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-rose-500" /> Total Expense
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-3 rounded bg-indigo-600" /> Net Profit
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No transaction data available for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
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
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar
                      dataKey="totalSales"
                      name="Total Sales"
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    />
                    <Bar
                      dataKey="totalExpense"
                      name="Total Expense"
                      fill="#F43F5E"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    />
                    <Line
                      type="monotone"
                      dataKey="netAmount"
                      name="Net Profit"
                      stroke="#4F46E5"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#4F46E5" }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Payment Method Distribution Donut Chart */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-2">
              <h2 className="text-base font-bold text-slate-900">
                Payment Channel Breakdown
              </h2>
              <p className="text-xs text-slate-400">
                Distribution of collections across Cash, GPay, and Bank Account
              </p>
            </div>

            <div className="relative flex h-56 w-full items-center justify-center">
              {paymentDonutData.length === 0 ? (
                <p className="text-xs text-slate-400">No collections in this period</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {paymentDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PaymentTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Donut Legend Cards */}
            <div className="mt-2 space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-50">
                    <CashIcon width="14" height="14" color="#059669" />
                  </span>
                  <span className="font-medium text-slate-700">Cash</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">
                    ₹ {formatINR(summaryTotals.cash)}
                  </span>
                  <span className="ml-1.5 text-[11px] text-slate-400">
                    (
                    {summaryTotals.totalReceived > 0
                      ? Math.round(
                          (summaryTotals.cash / summaryTotals.totalReceived) *
                            100,
                        )
                      : 0}
                    %)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-50">
                    <GpayIcon width="14" height="14" color="#2563EB" />
                  </span>
                  <span className="font-medium text-slate-700">GPay</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">
                    ₹ {formatINR(summaryTotals.gpay)}
                  </span>
                  <span className="ml-1.5 text-[11px] text-slate-400">
                    (
                    {summaryTotals.totalReceived > 0
                      ? Math.round(
                          (summaryTotals.gpay / summaryTotals.totalReceived) *
                            100,
                        )
                      : 0}
                    %)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-50">
                    <AccountIcon width="14" height="14" color="#7C3AED" />
                  </span>
                  <span className="font-medium text-slate-700">Bank Account</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">
                    ₹ {formatINR(summaryTotals.account)}
                  </span>
                  <span className="ml-1.5 text-[11px] text-slate-400">
                    (
                    {summaryTotals.totalReceived > 0
                      ? Math.round(
                          (summaryTotals.account /
                            summaryTotals.totalReceived) *
                            100,
                        )
                      : 0}
                    %)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= SECONDARY CHARTS: DETAILED COMPOSITION & PAYMENT TRENDS ================= */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Detailed Composition: Local vs GST Sales & Expenses */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">
                Sales & Expense Composition (Local vs. GST)
              </h2>
              <p className="text-xs text-slate-400">
                Breakdown of direct local transactions compared to GST registered entries
              </p>
            </div>

            <div className="h-72 w-full">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
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
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar
                      dataKey="localSales"
                      name="Local Sales"
                      fill="#34D399"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="gstSales"
                      name="GST Sales"
                      fill="#059669"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="localExpense"
                      name="Local Expense"
                      fill="#FB7185"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="gstExpense"
                      name="GST Expense"
                      fill="#E11D48"
                      radius={[3, 3, 0, 0]}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Monthly Payment Channel Trend (Area Chart) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">
                Payment Channel Inflow Trends
              </h2>
              <p className="text-xs text-slate-400">
                Timeline visualization of cash, gpay, and account collection volumes
              </p>
            </div>

            <div className="h-72 w-full">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No collection data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorGpay" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient
                        id="colorAccount"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Area
                      type="monotone"
                      dataKey="cash"
                      name="Cash Inflow"
                      stroke="#10B981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCash)"
                    />
                    <Area
                      type="monotone"
                      dataKey="gpay"
                      name="GPay Inflow"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorGpay)"
                    />
                    <Area
                      type="monotone"
                      dataKey="account"
                      name="Bank Account"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorAccount)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
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
              Exact accounting breakdown per period with income, expenses, and collection channel totals
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
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
                  <th className="py-3.5 px-4 font-semibold">Cash</th>
                  <th className="py-3.5 px-4 font-semibold">GPay</th>
                  <th className="py-3.5 px-4 font-semibold">Account</th>
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
