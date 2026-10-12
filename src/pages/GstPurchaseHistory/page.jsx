import {
  Box,
  Checkbox,
  FormControl,
  FormLabel,
  IconButton,
  Option,
  Select,
  Table,
  Typography,
} from "@mui/joy";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getGstPurchaseHistorySummary } from "../../api/purchaseHistory";
import Button from "../../components/Button/Button";
import CardUI from "../../components/CardUI/CardUI";
import Datepicker from "../../components/Datepicker/Datepicker";
import {
  ClearIcon,
  CustomerIcon,
  LeftArrowIcon,
  MoneyExpenseIcon,
  MoneyReceiveIcon,
  RefreshIcon,
  RightIcon,
  SavePdfIcon,
} from "../../components/icons";
import InputField from "../../components/InputField/InputField";
import { useFinancialYear } from "../../context/financial-year-context";
import MainLayout from "../../layouts/MainLayout";
import dayjs from "../../utils/dayjs";
import { resolveApiDateRange } from "../../utils/financialYear";
import { formattedAmount } from "../../utils/FormatAmount";

function labelDisplayedRows({ from, to, count }) {
  return `${from}–${to} of ${count}`;
}

const GstPurchaseHistory = () => {
  const navigate = useNavigate();
  const { fromDate: fyFromDate, toDate: fyToDate, shortLabel: fyShortLabel } =
    useFinancialYear();

  // Filters
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [onlyWithPurchases, setOnlyWithPurchases] = useState(true);

  // Data states
  const [customerSummaries, setCustomerSummaries] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Load summary data
  const loadData = useCallback(async () => {
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
      const data = await getGstPurchaseHistorySummary({
        fromDate: from,
        toDate: to,
      });
      setCustomerSummaries(data || []);
      setPage(0);
    } catch (error) {
      console.error("Failed to load GST purchase history:", error);
      toast.error("Failed to load GST purchase history data");
      setCustomerSummaries([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, fyFromDate, fyToDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered customers based on search text & zero purchase toggle
  const filteredData = useMemo(() => {
    let result = customerSummaries;

    if (onlyWithPurchases) {
      result = result.filter((item) => (item.billCount || 0) > 0);
    }

    if (searchText.trim()) {
      const lower = searchText.trim().toLowerCase();
      result = result.filter((item) => {
        const name = (item.name || "").toLowerCase();
        const phone = (item.phonenumber || "").toLowerCase();
        const gstin = (item.gstin || "").toLowerCase();
        return (
          name.includes(lower) ||
          phone.includes(lower) ||
          gstin.includes(lower)
        );
      });
    }

    // Sort by Total Amount descending by default
    return [...result].sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
  }, [customerSummaries, searchText, onlyWithPurchases]);

  // Overall statistics
  const stats = useMemo(() => {
    const buyersWithBills = customerSummaries.filter(
      (c) => (c.billCount || 0) > 0,
    );
    const totalBuyers = buyersWithBills.length;
    const totalBills = customerSummaries.reduce(
      (sum, c) => sum + (c.billCount || 0),
      0,
    );
    const totalBase = customerSummaries.reduce(
      (sum, c) => sum + (c.baseAmount || 0),
      0,
    );
    const totalTax = customerSummaries.reduce(
      (sum, c) => sum + (c.taxAmount || 0),
      0,
    );
    const totalAmount = customerSummaries.reduce(
      (sum, c) => sum + (c.totalAmount || 0),
      0,
    );

    return {
      totalBuyers,
      totalBills,
      totalBase,
      totalTax,
      totalAmount,
    };
  }, [customerSummaries]);

  // Paginated records
  const paginatedData = useMemo(() => {
    if (rowsPerPage === -1) return filteredData;
    const startIndex = page * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (_, value) => {
    setRowsPerPage(Number(value));
    setPage(0);
  };

  const getLabelDisplayedRowsTo = () => {
    if (rowsPerPage === -1) return filteredData.length;
    return Math.min((page + 1) * rowsPerPage, filteredData.length);
  };

  // Navigate to GST customer detail bills page
  const handleNavigateCustomer = (customer) => {
    const targetId = customer.documentId || customer.customerId;
    const queryParams = new URLSearchParams();
    if (fromDate) queryParams.set("from", dayjs(fromDate).format("YYYY-MM-DD"));
    if (toDate) queryParams.set("to", dayjs(toDate).format("YYYY-MM-DD"));

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
    navigate(`/purshistory/gst/${encodeURIComponent(targetId)}${queryString}`, {
      state: {
        customer,
        fromDate,
        toDate,
      },
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredData.length) {
      toast.info("No data to export");
      return;
    }

    const headers = [
      "Customer Name",
      "GSTIN",
      "Phone Number",
      "Bill Count",
      "Base Amount (INR)",
      "Tax Amount (INR)",
      "Total Amount (INR)",
    ];

    const rows = filteredData.map((item) => [
      item.name || "-",
      item.gstin || "-",
      item.phonenumber || "-",
      item.billCount || 0,
      item.baseAmount || 0,
      item.taxAmount || 0,
      item.totalAmount || 0,
    ]);

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `GST_Purchase_History_${dayjs().format("YYYYMMDD_HHmmss")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  const activeRangeLabel =
    fromDate && toDate
      ? `${dayjs(fromDate).format("DD-MM-YYYY")} to ${dayjs(toDate).format("DD-MM-YYYY")}`
      : `FY ${fyShortLabel}`;

  return (
    <MainLayout>
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">
              GST Purchase History
            </h1>
            <span className="bg-[#EDE9FE] text-[#6D28D9] text-xs font-semibold px-2.5 py-1 rounded-full">
              {filteredData.length} Customers
            </span>
            <button
              onClick={loadData}
              title="Refresh Data"
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition"
            >
              <RefreshIcon />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Customer-wise purchase overview for GST bills (
            <span className="font-medium text-gray-700">{activeRangeLabel}</span>
            ). Click any customer to view all their individual bills.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            label="Export CSV"
            icon1={<SavePdfIcon color="#fff" />}
            icon2={<SavePdfIcon color="#9e77d2" />}
            className="bg-transparent border-[#9e77d2] text-[#9e77d2] hover:bg-[#9e77d2] hover:text-white font-medium px-4 py-2"
            onClick={handleExportCSV}
            disabled={filteredData.length === 0}
          />
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <CardUI
          title="Active GST Buyers"
          amount={stats.totalBuyers}
          icon={<CustomerIcon color="#292D32" width="34" height="34" />}
          titleColor="text-violet-900"
          className="w-full"
        />
        <CardUI
          title="Total GST Bills"
          amount={stats.totalBills}
          icon={<MoneyReceiveIcon color="#292D32" width="34" height="34" />}
          titleColor="text-blue-900"
          className="w-full"
        />
        <CardUI
          title="Total Purchase Amount"
          amount={stats.totalAmount}
          icon={<MoneyReceiveIcon color="#16a34a" width="34" height="34" />}
          titleColor="text-emerald-800"
          amountColor="text-emerald-700 font-semibold"
          className="w-full"
        />
        <CardUI
          title="Total Tax Collected"
          amount={stats.totalTax}
          icon={<MoneyExpenseIcon color="#2563eb" width="34" height="34" />}
          titleColor="text-blue-800"
          className="w-full"
        />
      </motion.div>

      {/* ── Filters Bar ── */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Date Filter */}
        <div className="flex items-center gap-4 flex-wrap">
          <Datepicker
            type="multipleDatePicker"
            FromDate={fromDate}
            ToDate={toDate}
            setFromDate={setFromDate}
            setToDate={setToDate}
          />
        </div>

        {/* Right Search & Controls */}
        <div className="flex items-center gap-4 flex-wrap w-full lg:w-auto">
          <div className="w-full sm:w-72">
            <InputField
              name="search"
              placeholder="Search name, phone, or GSTIN..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(0);
              }}
            />
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Checkbox
              checked={onlyWithPurchases}
              onChange={(e) => {
                setOnlyWithPurchases(e.target.checked);
                setPage(0);
              }}
              label="Buyers only"
              size="sm"
            />
          </div>

          {searchText && (
            <button
              type="button"
              onClick={() => {
                setSearchText("");
                setPage(0);
              }}
              className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 transition"
            >
              <ClearIcon width="14" height="14" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Customers Summary Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table borderAxis="both" hoverRow>
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th style={{ width: "5%" }}>#</th>
                <th style={{ width: "28%" }}>Customer Name</th>
                <th style={{ width: "16%" }}>GSTIN</th>
                <th style={{ width: "13%" }}>Phone Number</th>
                <th style={{ width: "10%", textAlign: "center" }}>Bill Count</th>
                <th style={{ width: "13%", textAlign: "right" }}>Tax Amount</th>
                <th style={{ width: "15%", textAlign: "right" }}>Total Amount</th>
                <th style={{ width: "10%", textAlign: "center" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9E77D2]"></div>
                      <span>Loading GST purchase history...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400">
                    No GST customers found with purchases in this period.
                  </td>
                </tr>
              ) : (
                paginatedData.map((cust, index) => {
                  const targetId = cust.documentId || cust.customerId;
                  const rowNumber =
                    rowsPerPage === -1
                      ? index + 1
                      : page * rowsPerPage + index + 1;

                  return (
                    <tr
                      key={targetId || index}
                      className="cursor-pointer hover:bg-purple-50/50 transition-colors"
                      onClick={() => handleNavigateCustomer(cust)}
                    >
                      <td className="text-gray-500 font-medium">{rowNumber}</td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 hover:text-[#6D28D9] transition">
                            {cust.name || "-"}
                          </span>
                          {cust.address && (
                            <span className="text-[11px] text-gray-400 line-clamp-1">
                              {cust.address}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-gray-700 font-mono text-xs">
                        {cust.gstin || <span className="text-gray-300 italic">—</span>}
                      </td>
                      <td className="text-gray-600 font-mono text-sm">
                        {cust.phonenumber || (
                          <span className="text-gray-300 italic">No phone</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            cust.billCount > 0
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {cust.billCount} {cust.billCount === 1 ? "bill" : "bills"}
                        </span>
                      </td>
                      <td
                        style={{ textAlign: "right" }}
                        className="font-mono text-sm text-gray-600"
                      >
                        ₹ {formattedAmount(cust.taxAmount)}
                      </td>
                      <td
                        style={{ textAlign: "right" }}
                        className="font-bold text-gray-900 font-mono text-base"
                      >
                        ₹ {formattedAmount(cust.totalAmount)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateCustomer(cust);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EDE9FE] text-[#6D28D9] hover:bg-[#6D28D9] hover:text-white rounded-lg text-xs font-semibold transition"
                        >
                          View Bills
                          <span className="text-sm">→</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* ── Pagination ── */}
            <tfoot>
              <tr>
                <td colSpan={8}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 2,
                      py: 1,
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
                          filteredData.length === 0
                            ? 0
                            : page * rowsPerPage + 1,
                        to: getLabelDisplayedRowsTo(),
                        count: filteredData.length,
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
                          getLabelDisplayedRowsTo() >= filteredData.length
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
      </div>
    </MainLayout>
  );
};

export default GstPurchaseHistory;
