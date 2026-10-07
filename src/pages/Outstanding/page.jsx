import {
  Box,
  FormControl,
  FormLabel,
  IconButton,
  Option,
  Select,
  Table,
  Typography,
} from "@mui/joy";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";
import { fetchOutstandingAccountRecords } from "../../api/outstanding";
import Button from "../../components/Button/Button";
import Datepicker from "../../components/Datepicker/Datepicker";
import {
  ClearIcon,
  LeftArrowIcon,
  MoneyExpenseIcon,
  MoneyReceiveIcon,
  PrinterIcon,
  RefreshIcon,
  RightIcon,
} from "../../components/icons";
import InputField from "../../components/InputField/InputField";
import { ROLES } from "../../config/appConfig";
import { useAuth } from "../../context/auth-context";
import { useFinancialYear } from "../../context/financial-year-context";
import MainLayout from "../../layouts/MainLayout";
import dayjs from "../../utils/dayjs";
import { resolveApiDateRange } from "../../utils/financialYear";
import { formattedAmount } from "../../utils/FormatAmount";
import OutstandingPrintDoc from "./OutstandingPrintDoc";

function labelDisplayedRows({ from, to, count }) {
  return `${from}–${to} of ${count}`;
}

const SOURCE_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "gstSales", label: "GST Sales" },
  { value: "gstExpense", label: "GST Expense" },
  { value: "admin", label: "Admin" },
  { value: "localExpense", label: "Local Expense" },
];

const SOURCE_BADGES = {
  gstSales: "bg-emerald-100 text-emerald-800 border-emerald-200",
  gstExpense: "bg-rose-100 text-rose-800 border-rose-200",
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  localExpense: "bg-indigo-100 text-indigo-800 border-indigo-200",
  localSales: "bg-blue-100 text-blue-800 border-blue-200",
};

const Outstanding = () => {
  const { role } = useAuth();
  const { fromDate: fyFromDate, toDate: fyToDate, shortLabel: fyShortLabel } =
    useFinancialYear();

  // Print ref
  const printRef = useRef(null);

  // States
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // ── Access Control: Accessible only to Admin and SuperAdmin users ──
  const isAdmin =
    role === ROLES.Admin ||
    role === ROLES.SuperAdmin ||
    role === "admin" ||
    role === "superadmin";

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Accounts_Outstanding_${dayjs().format("YYYYMMDD_HHmm")}`,
  });

  // ── Fetch Data ──
  const loadRecords = useCallback(async () => {
    const { shouldFetch, from, to } = resolveApiDateRange(
      fromDate,
      toDate,
      fyFromDate,
      fyToDate,
    );

    if (!shouldFetch) {
      return;
    }

    setLoading(true);
    try {
      const data = await fetchOutstandingAccountRecords({
        fromDate: from,
        toDate: to,
      });

      setRecords(data || []);
      setPage(0);
    } catch (error) {
      console.error("Failed to load accounts outstanding records:", error);
      toast.error("Failed to load accounts outstanding records");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, fyFromDate, fyToDate]);

  useEffect(() => {
    if (isAdmin) {
      loadRecords();
    }
  }, [loadRecords, isAdmin]);

  // ── Filtered Records ──
  const displayedRecords = useMemo(() => {
    const { from, to } = resolveApiDateRange(
      fromDate,
      toDate,
      fyFromDate,
      fyToDate,
    );

    return records.filter((item) => {
      // Date boundary check
      if (from || to) {
        const itemDate = dayjs(item.date);
        if (from && itemDate.isBefore(dayjs(from).startOf("day"))) {
          return false;
        }
        if (to && itemDate.isAfter(dayjs(to).endOf("day"))) {
          return false;
        }
      }

      // Source Filter
      if (sourceFilter !== "all" && item.sourceKey !== sourceFilter) {
        return false;
      }

      // Search Query
      if (searchText.trim()) {
        const q = searchText.toLowerCase().trim();
        const matchName = (item.name || "").toLowerCase().includes(q);
        const matchSource = (item.source || "").toLowerCase().includes(q);
        const matchBill = item.billNo
          ? String(item.billNo).toLowerCase().includes(q)
          : false;

        if (!matchName && !matchSource && !matchBill) {
          return false;
        }
      }

      return true;
    });
  }, [records, fromDate, toDate, fyFromDate, fyToDate, sourceFilter, searchText]);

  // ── Totals accurately calculated based on displayed/filtered records ──
  const totalCredit = useMemo(() => {
    return displayedRecords.reduce(
      (sum, item) => sum + (Number(item.credit) || 0),
      0,
    );
  }, [displayedRecords]);

  const totalDebit = useMemo(() => {
    return displayedRecords.reduce(
      (sum, item) => sum + (Number(item.debit) || 0),
      0,
    );
  }, [displayedRecords]);

  const netBalance = totalCredit - totalDebit;

  // ── Paginated slice for current page ──
  const paginatedRecords = useMemo(() => {
    if (rowsPerPage === -1) return displayedRecords;
    const startIndex = page * rowsPerPage;
    return displayedRecords.slice(startIndex, startIndex + rowsPerPage);
  }, [displayedRecords, page, rowsPerPage]);

  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (_, value) => {
    setRowsPerPage(Number(value));
    setPage(0);
  };

  const getLabelDisplayedRowsTo = () => {
    if (rowsPerPage === -1) return displayedRecords.length;
    return Math.min((page + 1) * rowsPerPage, displayedRecords.length);
  };

  // If user is not admin, redirect away
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Accounts Outstanding
            </h1>
            <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Bank & Account ledger movement statement (Credit & Debit)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            label="Refresh"
            icon1={<RefreshIcon />}
            icon2={<RefreshIcon />}
            onClick={loadRecords}
            disabled={loading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-xs px-3 py-1.5"
          />

          <Button
            type="button"
            label="Print Statement"
            icon1={<PrinterIcon color="#fff" />}
            icon2={<PrinterIcon color="#fff" />}
            onClick={handlePrint}
            disabled={loading || displayedRecords.length === 0}
            className="bg-[#4F46E5] hover:bg-[#4338CA] text-white border-0 text-xs px-4 py-1.5 font-semibold cursor-pointer shadow-sm"
          />
        </div>
      </div>

      {/* ── Metric Summary Cards ── */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Total Credit Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Total Credit
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <MoneyReceiveIcon width="18" height="18" color="#059669" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600">
            ₹ {formattedAmount(totalCredit)}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Total money received into account
          </p>
        </div>

        {/* Total Debit Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Total Debit
            </span>
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
              <MoneyExpenseIcon width="18" height="18" color="#E11D48" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-600">
            ₹ {formattedAmount(totalDebit)}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Total money paid out from account
          </p>
        </div>

        {/* Net Balance Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Net Balance
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                netBalance >= 0
                  ? "bg-blue-100 text-blue-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              Credit – Debit
            </span>
          </div>
          <div
            className={`mt-2 text-2xl font-extrabold ${
              netBalance >= 0 ? "text-indigo-600" : "text-rose-600"
            }`}
          >
            ₹ {formattedAmount(netBalance)}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Net account movement
          </p>
        </div>

        {/* Total Records Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Total Entries
            </span>
            <span className="text-[10px] font-medium text-gray-400">
              FY {fyShortLabel}
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-gray-800">
            {displayedRecords.length}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Matching account transactions
          </p>
        </div>
      </motion.div>

      {/* ── Filters Section (Date Range, Source, Search) ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Datepicker Component */}
          <div className="md:col-span-6 lg:col-span-5">
            <Datepicker
              type="multipleDatePicker"
              FromDate={fromDate}
              ToDate={toDate}
              setFromDate={setFromDate}
              setToDate={setToDate}
            />
          </div>

          {/* Source Filter Select */}
          <div className="md:col-span-3 lg:col-span-3">
            <FormControl size="sm">
              <FormLabel className="text-xs font-semibold text-gray-700">
                Source Filter
              </FormLabel>
              <Select
                value={sourceFilter}
                onChange={(_, val) => {
                  setSourceFilter(val || "all");
                  setPage(0);
                }}
                className="w-full h-9 bg-white text-xs border-gray-300 rounded-md"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <Option key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </FormControl>
          </div>

          {/* Search Field */}
          <div className="md:col-span-3 lg:col-span-4">
            <InputField
              placeholder="Search Name or Source..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(0);
              }}
              required={false}
            />
          </div>
        </div>

        {/* Applied Filters Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">Active Period:</span>
            {fromDate && toDate ? (
              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium border border-indigo-200">
                Custom: {dayjs(fromDate).format("DD/MM/YYYY")} –{" "}
                {dayjs(toDate).format("DD/MM/YYYY")}
              </span>
            ) : (
              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                Default: Financial Year {fyShortLabel} ({dayjs(fyFromDate).format("DD/MM/YYYY")} – {dayjs(fyToDate).format("DD/MM/YYYY")})
              </span>
            )}
            {sourceFilter !== "all" && (
              <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-medium border border-purple-200">
                Source: {SOURCE_OPTIONS.find((s) => s.value === sourceFilter)?.label}
              </span>
            )}
            {searchText && (
              <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium border border-amber-200">
                Search: &quot;{searchText}&quot;
              </span>
            )}
          </div>

          {(fromDate || toDate || sourceFilter !== "all" || searchText) && (
            <button
              type="button"
              onClick={() => {
                setFromDate(null);
                setToDate(null);
                setSourceFilter("all");
                setSearchText("");
                setPage(0);
              }}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
            >
              <ClearIcon /> Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Accounts Outstanding Table ── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <Table borderAxis="both" hoverRow className="text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-700 font-bold">
              <th className="w-[12%] py-3 px-3">Date</th>
              <th className="w-[18%] py-3 px-3">Source</th>
              <th className="w-[34%] py-3 px-3">Name</th>
              <th className="w-[18%] py-3 px-3 text-right">Credit (₹)</th>
              <th className="w-[18%] py-3 px-3 text-right">Debit (₹)</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading accounts outstanding records...</span>
                  </div>
                </td>
              </tr>
            ) : displayedRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-base font-semibold text-gray-700">
                      No Records Found
                    </span>
                    <span className="text-xs text-gray-400">
                      There are no accounts outstanding records for the selected filters.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((item) => {
                const creditVal = Number(item.credit) || 0;
                const debitVal = Number(item.debit) || 0;
                const badgeClass =
                  SOURCE_BADGES[item.sourceKey] ||
                  "bg-gray-100 text-gray-800 border-gray-200";

                return (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* 1. Date */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-medium text-gray-800">
                      {item.date ? dayjs(item.date).format("DD/MM/YYYY") : "-"}
                    </td>

                    {/* 2. Source */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${badgeClass}`}
                      >
                        {item.source}
                      </span>
                    </td>

                    {/* 3. Name */}
                    <td className="py-2.5 px-3 font-medium text-gray-900 break-words">
                      {item.name}
                    </td>

                    {/* 4. Credit */}
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                      {creditVal > 0 ? formattedAmount(creditVal) : "-"}
                    </td>

                    {/* 5. Debit */}
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                      {debitVal > 0 ? formattedAmount(debitVal) : "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* ── Table Footer: Displaying Total Credit and Total Debit ── */}
          <tfoot>
            {/* ── Primary Totals Row ── */}
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-700">
              <td
                colSpan={3}
                className="py-3 px-3 text-right text-xs uppercase font-extrabold text-gray-800 tracking-wider"
              >
                Totals ({displayedRecords.length} records):
              </td>
              <td className="py-3 px-3 text-right text-sm font-extrabold text-emerald-700 whitespace-nowrap">
                ₹ {formattedAmount(totalCredit)}
              </td>
              <td className="py-3 px-3 text-right text-sm font-extrabold text-rose-700 whitespace-nowrap">
                ₹ {formattedAmount(totalDebit)}
              </td>
            </tr>

            {/* ── Net Balance Row ── */}
            <tr className="bg-gray-50 border-t border-gray-200">
              <td
                colSpan={3}
                className="py-2 px-3 text-right text-xs uppercase font-bold text-gray-600"
              >
                Net Account Movement (Credit – Debit):
              </td>
              <td
                colSpan={2}
                className={`py-2 px-3 text-right text-sm font-extrabold ${
                  netBalance >= 0 ? "text-indigo-800" : "text-rose-700"
                }`}
              >
                ₹ {formattedAmount(netBalance)}
              </td>
            </tr>

            {/* ── Pagination Footer Controls ── */}
            <tr>
              <td colSpan={5} className="py-2 px-3 bg-white">
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 2,
                  }}
                >
                  <FormControl orientation="horizontal" size="sm">
                    <FormLabel>Rows per page:</FormLabel>
                    <Select
                      value={rowsPerPage}
                      onChange={handleChangeRowsPerPage}
                    >
                      <Option value={10}>10</Option>
                      <Option value={25}>25</Option>
                      <Option value={50}>50</Option>
                      <Option value={100}>100</Option>
                      <Option value={-1}>All</Option>
                    </Select>
                  </FormControl>

                  <Typography textAlign="center" sx={{ minWidth: 80 }}>
                    {labelDisplayedRows({
                      from:
                        displayedRecords.length === 0
                          ? 0
                          : page * rowsPerPage + 1,
                      to: getLabelDisplayedRowsTo(),
                      count: displayedRecords.length,
                    })}
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1 }}>
                    <IconButton
                      size="sm"
                      variant="outlined"
                      disabled={page === 0}
                      onClick={() => handleChangePage(page - 1)}
                    >
                      <LeftArrowIcon />
                    </IconButton>

                    <IconButton
                      size="sm"
                      variant="outlined"
                      disabled={
                        rowsPerPage === -1 ||
                        getLabelDisplayedRowsTo() >= displayedRecords.length
                      }
                      onClick={() => handleChangePage(page + 1)}
                    >
                      <RightIcon />
                    </IconButton>
                  </Box>
                </Box>
              </td>
            </tr>
          </tfoot>
        </Table>
      </div>

      {/* ── Hidden Print Document Container ── */}
      <div style={{ display: "none" }}>
        <OutstandingPrintDoc
          ref={printRef}
          title="Accounts Outstanding Statement"
          fromDate={fromDate}
          toDate={toDate}
          records={displayedRecords}
          totalCredit={totalCredit}
          totalDebit={totalDebit}
          sourceFilter={sourceFilter}
          generatedAt={new Date()}
        />
      </div>
    </MainLayout>
  );
};

export default Outstanding;
