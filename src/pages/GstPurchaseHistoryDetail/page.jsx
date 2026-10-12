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
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getGstCustomerById } from "../../api/gstCustomer";
import { fetchGstSalesBills } from "../../api/purchaseHistory";
import Button from "../../components/Button/Button";
import CardUI from "../../components/CardUI/CardUI";
import Datepicker from "../../components/Datepicker/Datepicker";
import EditButton from "../../components/EditButton/EditButton";
import {
  ClearIcon,
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
import { GSTSALESENTRY, GST_PURCHASE_HISTORY } from "../../router/paths";
import dayjs from "../../utils/dayjs";
import { resolveApiDateRange } from "../../utils/financialYear";
import { formattedAmount } from "../../utils/FormatAmount";

function labelDisplayedRows({ from, to, count }) {
  return `${from}–${to} of ${count}`;
}

const getStatusBadge = (status) => {
  switch ((status || "").toLowerCase()) {
    case "paid":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "manual_paid":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-amber-100 text-amber-800 border-amber-200";
  }
};

const GstPurchaseHistoryDetail = () => {
  const { customerId: rawCustomerId } = useParams();
  const customerId = decodeURIComponent(rawCustomerId || "");
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { fromDate: fyFromDate, toDate: fyToDate, shortLabel: fyShortLabel } =
    useFinancialYear();

  // Initial date filter from state or URL query
  const initialFromDate =
    location.state?.fromDate || searchParams.get("from") || null;
  const initialToDate =
    location.state?.toDate || searchParams.get("to") || null;

  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  const [searchBillNo, setSearchBillNo] = useState("");

  const [customer, setCustomer] = useState(location.state?.customer || null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Load GST customer details if not in state
  const loadCustomerInfo = useCallback(async () => {
    if (customer?.name) return;
    if (!customerId || customerId.startsWith("name-") || customerId === "unknown") return;

    try {
      const res = await getGstCustomerById(customerId);
      if (res) {
        setCustomer(res);
      }
    } catch (err) {
      console.warn("Could not load GST customer info by ID:", err);
    }
  }, [customerId, customer]);

  useEffect(() => {
    loadCustomerInfo();
  }, [loadCustomerInfo]);

  // Load bills for this specific customer
  const loadBills = useCallback(async () => {
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
      const isNamedKey = customerId.startsWith("name-");
      const filterCustomerId = isNamedKey ? null : customerId;

      const data = await fetchGstSalesBills({
        fromDate: from,
        toDate: to,
        customerId: filterCustomerId,
      });

      const targetCustomerName = (
        customer?.name ||
        (isNamedKey ? customerId.replace("name-", "") : "")
      ).trim().toLowerCase();

      const matchedBills = data.filter((item) => {
        if (!filterCustomerId) {
          const itemCustName = (
            item?.gst_customer?.name ||
            item?.customer_name ||
            ""
          ).trim().toLowerCase();
          return itemCustName === targetCustomerName;
        }

        const matchDocId =
          item?.gst_customer?.documentId === customerId ||
          String(item?.gst_customer?.id) === customerId;
        const matchName =
          targetCustomerName &&
          (item?.gst_customer?.name || "").trim().toLowerCase() === targetCustomerName;

        return matchDocId || matchName;
      });

      setBills(matchedBills);

      if (!customer?.name && matchedBills.length > 0) {
        const firstCust = matchedBills[0].gst_customer;
        if (firstCust) {
          setCustomer(firstCust);
        }
      }

      setPage(0);
    } catch (error) {
      console.error("Failed to load GST customer bills:", error);
      toast.error("Failed to load customer bills");
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, [customerId, customer, fromDate, toDate, fyFromDate, fyToDate]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  // Filtered bills by search
  const filteredBills = useMemo(() => {
    if (!searchBillNo.trim()) return bills;
    const lower = searchBillNo.trim().toLowerCase();
    return bills.filter((b) => {
      const billNoStr = String(b.bill_no || "").toLowerCase();
      const particularStr = (b.particulars || [])
        .map((p) => p.text)
        .join(" ")
        .toLowerCase();
      return billNoStr.includes(lower) || particularStr.includes(lower);
    });
  }, [bills, searchBillNo]);

  // Statistics
  const stats = useMemo(() => {
    const totalAmount = bills.reduce(
      (sum, b) => sum + Number(b.total_amount || 0),
      0,
    );
    const totalBase = bills.reduce(
      (sum, b) => sum + Number(b.base_amount || 0),
      0,
    );
    const totalTax = bills.reduce(
      (sum, b) => sum + Number(b.tax_amount || 0),
      0,
    );

    return {
      billCount: bills.length,
      totalBase,
      totalTax,
      totalAmount,
    };
  }, [bills]);

  // Paginated bills
  const paginatedBills = useMemo(() => {
    if (rowsPerPage === -1) return filteredBills;
    const startIndex = page * rowsPerPage;
    return filteredBills.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredBills, page, rowsPerPage]);

  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (_, value) => {
    setRowsPerPage(Number(value));
    setPage(0);
  };

  const getLabelDisplayedRowsTo = () => {
    if (rowsPerPage === -1) return filteredBills.length;
    return Math.min((page + 1) * rowsPerPage, filteredBills.length);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredBills.length) {
      toast.info("No bills to export");
      return;
    }

    const headers = [
      "Date",
      "Bill No",
      "Customer",
      "Particulars",
      "Base Amount (INR)",
      "Tax Amount (INR)",
      "Total Amount (INR)",
      "Status",
    ];

    const rows = filteredBills.map((b) => [
      dayjs(b.date).format("DD-MM-YYYY"),
      b.bill_no || "-",
      customer?.name || b.gst_customer?.name || "-",
      (b.particulars || []).map((p) => p.text).join("; ") || "-",
      b.base_amount || 0,
      b.tax_amount || 0,
      b.total_amount || 0,
      b.current_status || "-",
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
      `GST_Bills_${customer?.name || "Customer"}_${dayjs().format("YYYYMMDD_HHmmss")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("GST bills exported successfully");
  };

  const activeRangeLabel =
    fromDate && toDate
      ? `${dayjs(fromDate).format("DD-MM-YYYY")} to ${dayjs(toDate).format("DD-MM-YYYY")}`
      : `FY ${fyShortLabel}`;

  return (
    <MainLayout>
      {/* ── Page Header & Back Button ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(GST_PURCHASE_HISTORY)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
            >
              <span>← Back</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-800">
              {customer?.name || "GST Customer Bills"}
            </h1>
            <span className="bg-[#EDE9FE] text-[#6D28D9] text-xs font-semibold px-2.5 py-1 rounded-full">
              {filteredBills.length} Bills
            </span>
            <button
              onClick={loadBills}
              title="Refresh Bills"
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition"
            >
              <RefreshIcon />
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1 flex-wrap">
            {customer?.gstin && (
              <span>
                GSTIN:{" "}
                <span className="font-mono text-gray-700 font-medium">
                  {customer.gstin}
                </span>
              </span>
            )}
            {customer?.phonenumber && (
              <span>
                Phone:{" "}
                <span className="font-mono text-gray-700 font-medium">
                  {customer.phonenumber}
                </span>
              </span>
            )}
            <span>
              Period:{" "}
              <span className="font-medium text-gray-700">
                {activeRangeLabel}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            label="Export Bills CSV"
            icon1={<SavePdfIcon color="#fff" />}
            icon2={<SavePdfIcon color="#9e77d2" />}
            className="bg-transparent border-[#9e77d2] text-[#9e77d2] hover:bg-[#9e77d2] hover:text-white font-medium px-4 py-2"
            onClick={handleExportCSV}
            disabled={filteredBills.length === 0}
          />
        </div>
      </div>

      {/* ── Summary Stats Cards ── */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <CardUI
          title="Total Bills"
          amount={stats.billCount}
          icon={<MoneyReceiveIcon color="#292D32" width="34" height="34" />}
          titleColor="text-violet-900"
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
          title="Total Base Amount"
          amount={stats.totalBase}
          icon={<MoneyReceiveIcon color="#4f46e5" width="34" height="34" />}
          titleColor="text-indigo-900"
          className="w-full"
        />
        <CardUI
          title="Total Tax"
          amount={stats.totalTax}
          icon={<MoneyExpenseIcon color="#2563eb" width="34" height="34" />}
          titleColor="text-blue-800"
          className="w-full"
        />
      </motion.div>

      {/* ── Filter Bar ── */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
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

        {/* Search Bill Number */}
        <div className="flex items-center gap-4 w-full md:w-80">
          <InputField
            name="searchBillNo"
            placeholder="Search by Bill # or item..."
            value={searchBillNo}
            onChange={(e) => {
              setSearchBillNo(e.target.value);
              setPage(0);
            }}
          />
          {searchBillNo && (
            <button
              type="button"
              onClick={() => setSearchBillNo("")}
              className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 transition shrink-0"
            >
              <ClearIcon width="14" height="14" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Bills Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table borderAxis="both" hoverRow>
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th style={{ width: "5%" }}>#</th>
                <th style={{ width: "10%" }}>Date</th>
                <th style={{ width: "10%" }}>Bill No</th>
                <th style={{ width: "30%" }}>Particulars</th>
                <th style={{ width: "10%", textAlign: "center" }}>Status</th>
                <th style={{ width: "11%", textAlign: "right" }}>Base Amount</th>
                <th style={{ width: "11%", textAlign: "right" }}>Tax Amount</th>
                <th style={{ width: "13%", textAlign: "right" }}>Total Amount</th>
                <th style={{ width: "5%", textAlign: "center" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9E77D2]"></div>
                      <span>Loading bills for this GST customer...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedBills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-400">
                    No GST bills found for this customer in the selected date range.
                  </td>
                </tr>
              ) : (
                paginatedBills.map((bill, index) => {
                  const targetId = bill.documentId || bill.id;
                  const rowNumber =
                    rowsPerPage === -1
                      ? index + 1
                      : page * rowsPerPage + index + 1;

                  return (
                    <tr key={targetId || index}>
                      <td className="text-gray-500 font-medium">{rowNumber}</td>
                      <td className="text-gray-700 text-sm whitespace-nowrap">
                        {bill.date
                          ? dayjs(bill.date).format("DD-MM-YYYY")
                          : "-"}
                      </td>
                      <td className="font-bold text-[#6D28D9] font-mono">
                        #{bill.bill_no || "-"}
                      </td>
                      <td className="text-sm text-gray-700">
                        {bill.particulars?.length > 0 ? (
                          <div className="space-y-0.5">
                            {bill.particulars.map((p, pIdx) => (
                              <div key={p.id || pIdx} className="line-clamp-2">
                                {p.text}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No items</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                            bill.current_status,
                          )}`}
                        >
                          {bill.current_status || "—"}
                        </span>
                      </td>
                      <td
                        style={{ textAlign: "right" }}
                        className="font-mono text-sm text-gray-600"
                      >
                        ₹ {formattedAmount(bill.base_amount || 0)}
                      </td>
                      <td
                        style={{ textAlign: "right" }}
                        className="font-mono text-sm text-gray-600"
                      >
                        ₹ {formattedAmount(bill.tax_amount || 0)}
                      </td>
                      <td
                        style={{ textAlign: "right" }}
                        className="font-bold text-gray-900 font-mono text-base"
                      >
                        ₹ {formattedAmount(bill.total_amount || 0)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <EditButton
                          onClick={() =>
                            navigate(`${GSTSALESENTRY}?editId=${bill.documentId}`)
                          }
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* ── Pagination ── */}
            <tfoot>
              <tr>
                <td colSpan={9}>
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
                          filteredBills.length === 0
                            ? 0
                            : page * rowsPerPage + 1,
                        to: getLabelDisplayedRowsTo(),
                        count: filteredBills.length,
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
                          getLabelDisplayedRowsTo() >= filteredBills.length
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

export default GstPurchaseHistoryDetail;
