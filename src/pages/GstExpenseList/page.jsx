import {
  Autocomplete,
  Box,
  Checkbox,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Option,
  Select,
  Table,
  Typography,
} from "@mui/joy";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import AutocompleteField from "../../components/AutocompleteField/AutocompleteField";
import CardUI from "../../components/CardUI/CardUI";
import Datepicker, {
  DateUiPicker,
} from "../../components/Datepicker/Datepicker";
import DeletePopup from "../../components/DeletePopup/DeletePopup";
import EditButton from "../../components/EditButton/EditButton";
import { useFinancialYear } from "../../context/financial-year-context";
import MainLayout from "../../layouts/MainLayout";
import { GSTEXPENSEENTRY } from "../../router/paths";
import dayjs from "../../utils/dayjs";
import { resolveApiDateRange } from "../../utils/financialYear";
import { formattedAmount } from "../../utils/FormatAmount";
import { findMatchingEntity } from "../../utils/nameNormalizer";

import {
  createGstExpenseList,
  deleteGstExpenseList,
  getGstExpenseList,
  getGstExpenseSummary,
  updateGstExpenseList,
} from "../../api/gstExpense";
import { getVendors } from "../../api/vendor";
import Button from "../../components/Button/Button";
import Filter from "../../components/Fitler/Filter";
import {
  AccountIcon,
  CashIcon,
  CheckBoxIcon,
  CheckIcon,
  GpayIcon,
  MoneyExpenseIcon,
  MoneyReceiveIcon,
  PendingIcon,
  SaveIcon,
  SavePdfIcon,
} from "../../components/icons";
import GstExpenseExportModal from "../../components/GstExpenseExportModal/GstExpenseExportModal";
import LeftArrowIcon from "../../components/icons/LeftArrowIcon";
import RefreshIcon from "../../components/icons/RefreshIcon";
import RightIcon from "../../components/icons/RightIcon";
import InputField from "../../components/InputField/InputField";
import SelectField from "../../components/SelectField/SelectField";
import { useAuth } from "../../context/auth-context";
import { setCurrentTime } from "../../utils/DatewithTime";

function labelDisplayedRows({ from, to, count }) {
  return `${from}–${to} of ${count !== -1 ? count : `more than ${to}`}`;
}

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 100];

const FILTER_OPTIONS = [
  { value: "status", label: "status", type: "status" },
  { value: "paid", label: "Paid", type: "status" },
  { value: "manual_paid", label: "Manual Paid", type: "status" },

  { value: "cash", label: "Cash", type: "method" },
  { value: "gpay", label: "GPay", type: "method" },
  { value: "account", label: "Account", type: "method" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "gpay", label: "GPay" },
  { value: "account", label: "Account" },
];

const STATUS_OPTIONS = [
  { value: "status", label: "Status" },
  { value: "paid", label: "Paid" },
  { value: "manual_paid", label: "Manual Paid" },
];

const INITIAL_FORM_STATE = {
  date: null,
  customType: "gpay",
  sendedAmount: "",
  particulars: "",
  editId: null,
  sendedBillNo: [],
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

const GstExpenseList = () => {
  const { role, showOverview, toggleOverview } = useAuth();
  const { fromDate: fyFromDate, toDate: fyToDate } = useFinancialYear();
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const [searchCustomer, setSearchCustomer] = useState(null);

  const [gstCustomers, setGstCustomers] = useState([]);
  const [gstSalesData, setGstSalesData] = useState([]);
  const [gstSalesSummary, setGstSalesSummary] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [form, setForm] = useState({
    ...INITIAL_FORM_STATE,
    date: setCurrentTime(new Date()),
  });

  const billNosData = useMemo(
    () =>
      gstSalesData
        .filter((item) => item.bill_no && item.current_status !== "paid")
        .map((item) => ({
          label: `${item.bill_no} — ₹ ${formattedAmount(item.total_amount)}`,
          value: item.documentId,
          amount: Number(item.total_amount) || 0,
          bill_no: item.bill_no,
        })),
    [gstSalesData],
  );

  const totalBillAmount = useMemo(
    () => form.sendedBillNo.reduce((sum, item) => sum + (item.amount || 0), 0),
    [form.sendedBillNo],
  );

  const buildQuery = useCallback(
    (extraParams = {}) => {
      const { shouldFetch, from, to } = resolveApiDateRange(
        fromDate,
        toDate,
        fyFromDate,
        fyToDate,
      );

      if (!shouldFetch) {
        return null;
      }

      const params = new URLSearchParams();

      params.set("pagination[page]", String(page + 1));
      params.set("pagination[pageSize]", String(rowsPerPage));
      params.set("sort[0]", "date:desc");

      if (searchCustomer?.value) {
        params.set("filters[vendor][documentId][$eq]", searchCustomer.value);
      }

      if (from && to) {
        const startDate = dayjs(from).startOf("day").toISOString();
        const endDate = dayjs(to).endOf("day").toISOString();

        params.set("filters[date][$gte]", startDate);
        params.set("filters[date][$lte]", endDate);
      }

      if (statusFilter.type === "status") {
        params.set("filters[current_status][$in]", statusFilter.value);
      }

      if (statusFilter.type === "method") {
        params.set("filters[sended_method][$eq]", statusFilter.value);
      }

      Object.entries(extraParams).forEach(([k, v]) => params.set(k, v));

      return params.toString();
    },
    [page, rowsPerPage, searchCustomer, fromDate, toDate, fyFromDate, fyToDate, statusFilter],
  );

  /* ─────────────────────────────────────────────
     Data loaders
  ───────────────────────────────────────────── */

  const loadGstCustomers = useCallback(async () => {
    try {
      const res = await getVendors();
      setGstCustomers(res || []);
    } catch (err) {
      console.error("Customer fetch failed:", err);
      setGstCustomers([]);
    }
  }, []);

  const loadGstSalesData = useCallback(async () => {
    const queryString = buildQuery();
    if (queryString === null) {
      setGstSalesData([]);
      return;
    }

    setLoading(true);
    try {
      const res = await getGstExpenseList(queryString);
      setGstSalesData(res?.data || []);
      setTotalCount(res?.meta?.pagination?.total || 0);
    } catch (err) {
      console.error("GST sales list fetch failed:", err);
      toast.error("Failed to load GST sales list.");
      setGstSalesData([]);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const loadGstSalesSummary = useCallback(async () => {
    const { shouldFetch, from, to } = resolveApiDateRange(
      fromDate,
      toDate,
      fyFromDate,
      fyToDate,
    );

    if (!shouldFetch) {
      setGstSalesSummary(null);
      return;
    }

    try {
      const params = new URLSearchParams();

      if (searchCustomer?.value) {
        params.set("filters[vendor][documentId][$eq]", searchCustomer.value);
      }

      if (from && to) {
        params.set("fromDate", dayjs(from).format("YYYY-MM-DD"));
        params.set("toDate", dayjs(to).format("YYYY-MM-DD"));
      }

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const res = await getGstExpenseSummary(queryString);
      setGstSalesSummary(res);
    } catch (err) {
      console.error("GST sales summary fetch failed:", err);
      setGstSalesSummary(null);
    }
  }, [searchCustomer, fromDate, toDate, fyFromDate, fyToDate]);

  /* ─────────────────────────────────────────────
     Effects
  ───────────────────────────────────────────── */

  useEffect(() => {
    loadGstCustomers();
  }, [loadGstCustomers]);
  useEffect(() => {
    loadGstSalesData();
  }, [loadGstSalesData]);
  useEffect(() => {
    if(showOverview) {
    loadGstSalesSummary();
    }
  }, [loadGstSalesSummary, showOverview]);

  /* ─────────────────────────────────────────────
     Form helpers
  ───────────────────────────────────────────── */

  const setFormField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const resetForm = () =>
    setForm({ ...INITIAL_FORM_STATE, date: setCurrentTime(new Date()) });

  const buildPayload = () => {
    console.log(form.sendedBillNo, "form.sendedBillNo");
    return {
      date: form.date,
      vendor: searchCustomer?.value ?? null,
      sended_bill_nos: form.sendedBillNo,
      sended_method: form.customType,
      sended_amount: Number(form.sendedAmount),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!searchCustomer?.value) {
      toast.warning("Please select a customer.");
      return;
    }

    const payload = buildPayload();

    try {
      if (!form.editId) {
        await createGstExpenseList(payload);

        // Update all selected bills to paid
        await Promise.all(
          form.sendedBillNo.map((bill) =>
            updateGstExpenseList(bill.value, {
              current_status: "paid",
            }),
          ),
        );

        toast.success("Party amount added successfully.");
      } else {
        await updateGstExpenseList(form.editId, payload);

        await Promise.all(
          form.sendedBillNo.map((bill) =>
            updateGstExpenseList(bill.value, {
              current_status: "paid",
            }),
          ),
        );

        toast.success("Party amount updated successfully.");
      }

      setSearchCustomer(null);
      resetForm();
      await loadGstSalesData();
    } catch (err) {
      console.error("Submit failed:", err);
      toast.error("Failed to save. Please try again.");
    }
  };

  const handleEdit = (item) => {
    setSearchCustomer(
      item.vendor
        ? { label: item.vendor.name, value: item.vendor.documentId }
        : null,
    );

    console.log(item);

    setForm({
      editId: item.documentId,
      date: setCurrentTime(new Date(item.date)),
      customType: item.sended_method ?? "cash",
      sendedAmount: item.sended_amount || "",
      sendedBillNo: item.sended_bill_nos || [],
    });
  };

  const handleDelete = async (item) => {
    try {
      // If this is a receipt entry
      if (
        !item.bill_no &&
        Array.isArray(item.sended_bill_nos) &&
        item.sended_bill_nos.length
      ) {
        await Promise.all(
          item.sended_bill_nos.map((bill) =>
            updateGstExpenseList(bill.value, {
              current_status: "status",
            }),
          ),
        );
      }

      await deleteGstExpenseList(item.documentId);

      toast.success("Deleted successfully.");
      await loadGstSalesData();
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete. Please try again.");
    }
  };

  const handleStatusChange = async (documentId, value) => {
    try {
      await updateGstExpenseList(documentId, { current_status: value });
      await loadGstSalesData();
    } catch (err) {
      console.error("Status update failed:", err);
      toast.error("Failed to update status. Please try again.");
    }
  };

  /* ─────────────────────────────────────────────
     Pagination helpers
  ───────────────────────────────────────────── */

  const rowsTo = Math.min((page + 1) * rowsPerPage, totalCount);

  const handleChangePage = (newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (_, value) => {
    setRowsPerPage(value);
    setPage(0);
  };

  /* ─────────────────────────────────────────────
     Customer options (memoised)
  ───────────────────────────────────────────── */

  const customerOptions = useMemo(
    () => gstCustomers.map((c) => ({ label: c.name, value: c.documentId })),
    [gstCustomers],
  );

  const parseBillNos = (value) => {
    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (
          <div className="flex flex-col gap-0.5">
            {parsed.map((b, idx) => (
              <div key={idx} className="whitespace-nowrap">
                {typeof b === "object" ? b?.label || b?.value || "—" : b}
              </div>
            ))}
          </div>
        );
      }
      return value || "—";
    } catch {
      return value || "—";
    }
  };

  /* ─────────────────────────────────────────────
     Render
  ───────────────────────────────────────────── */

  return (
    <MainLayout>
      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">GST Expense List</h1>

          <button
            onClick={() => {
              window.location.reload();
            }}
          >
            <RefreshIcon />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            label="Export"
            icon1={<SavePdfIcon color="#fff" />}
            icon2={<SavePdfIcon color="#fff" />}
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 text-xs px-4 cursor-pointer"
            onClick={() => setExportModalOpen(true)}
          />

          {role !== "authenticated" && (
            <Checkbox
              icon={<CheckBoxIcon />}
              checkedIcon={<CheckIcon color="#fff" />}
              checked={showOverview}
              label="Show Overview"
              onChange={toggleOverview}
            />
          )}
        </div>
      </div>

      {showOverview && (
        <motion.div
          className="grid grid-cols-4 gap-2 mt-6 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <CardUI
            title="Total Expense"
            amount={gstSalesSummary?.total_expense}
            icon={<MoneyReceiveIcon color="#292D32" width="34" height="34" />}
            titleColor="text-violet-900"
            className="w-full"
          />
          <CardUI
            title="Manual Paid"
            amount={gstSalesSummary?.total_manual_paid}
            icon={<MoneyReceiveIcon color="#292D32" width="34" height="34" />}
            titleColor="text-orange-800"
            className="w-full"
          />
          <CardUI
            title="Total Tax"
            amount={Math.round(gstSalesSummary?.total_tax)}
            icon={<MoneyExpenseIcon color="#292D32" width="34" height="34" />}
            titleColor="text-blue-800"
            className="w-full"
          />
          <CardUI
            title="Total Balance"
            amount={gstSalesSummary?.total_balance}
            icon={<PendingIcon color="#292D32" width="34" height="34" />}
            titleColor="text-red-500"
            className="w-full"
          />
          <CardUI
            title="Total Account"
            amount={gstSalesSummary?.total_account}
            icon={<AccountIcon color="#292D32" width="34" height="34" />}
            titleColor="text-green-800"
            className="w-full"
          />
          <CardUI
            title="Total Cash"
            amount={gstSalesSummary?.total_cash}
            icon={<CashIcon color="#292D32" width="34" height="34" />}
            titleColor="text-green-800"
            className="w-full"
          />
          <CardUI
            title="Total Gpay"
            amount={gstSalesSummary?.total_gpay}
            icon={<GpayIcon color="#292D32" width="34" height="34" />}
            titleColor="text-green-800"
            className="w-full"
          />
        </motion.div>
      )}

      {/* Filters */}

      <div className="flex gap-4 items-center">
        <Datepicker
          type="multipleDatePicker"
          FromDate={fromDate}
          ToDate={toDate}
          setFromDate={(d) => {
            setFromDate(d);
            setPage(0);
          }}
          setToDate={(d) => {
            setToDate(d);
            setPage(0);
          }}
        />
      </div>

      <div className="flex justify-end items-end gap-4 mt-6">
        <div className="w-80">
          <AutocompleteField
            label="Filter by Customer"
            value={searchCustomer || ""}
            options={customerOptions}
            onChange={(_, val) => {
              const resolved =
                typeof val === "string"
                  ? findMatchingEntity(val, customerOptions, "label") || val
                  : val;
              setSearchCustomer(resolved);
              setPage(0);
            }}
          />
        </div>
        <Filter
          options={FILTER_OPTIONS}
          setSelected={setStatusFilter}
          onApply={() => {
            setPage(0);
            loadGstSalesData();
          }}
        />
      </div>

      {/* ── Add / Edit form ── */}
      <form onSubmit={handleSubmit} className="mt-8">
        <div className="grid grid-cols-6 gap-4 ">
          {/* Date */}
          <DateUiPicker
            value={form.date}
            label="Date"
            onChange={(d) => setFormField("date", setCurrentTime(d))}
            minDate={role === "superadmin" ? undefined : new Date()}
            required
          />

          {/* Customer */}
          <AutocompleteField
            label="Customer Name"
            value={searchCustomer || ""}
            options={customerOptions}
            onChange={(_, val) => {
              const resolved =
                typeof val === "string"
                  ? findMatchingEntity(val, customerOptions, "label") || val
                  : val;
              setSearchCustomer(resolved);
              setPage(0);
              setFormField("sendedBillNo", []);
            }}
            required
          />

          {/* Bill Numbers (multi-select) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Bill Numbers&nbsp;
              {totalBillAmount > 0 && (
                <span className="text-indigo-600 font-semibold">
                  (₹{formattedAmount(totalBillAmount)})
                </span>
              )}
            </label>
            <Autocomplete
              multiple
              options={billNosData}
              value={form.sendedBillNo}
              onChange={(_, newValue) => setFormField("sendedBillNo", newValue)}
              disableCloseOnSelect
              getOptionLabel={(option) => option.label}
              placeholder="Select bill numbers"
              isOptionEqualToValue={(option, value) =>
                option.value === value.value
              }
              renderOption={(props, option, { selected }) => (
                <li {...props} className="pl-3 flex items-center mb-1">
                  <Checkbox
                    icon={<CheckBoxIcon />}
                    checkedIcon={<CheckIcon color="#fff" />}
                    checked={selected}
                    style={{ marginRight: 8 }}
                  />
                  {option.label}
                </li>
              )}
              renderInput={(params) => (
                <Input
                  {...params.inputProps}
                  ref={params.inputProps.ref}
                  required
                />
              )}
            />
          </div>

          {/* Payment method */}
          <SelectField
            label="Sended In"
            selectName="custom_type"
            options={PAYMENT_METHOD_OPTIONS}
            value={form.customType}
            onChange={(e) => setFormField("customType", e.target.value)}
            placeholder="Sended In"
            required
          />

          {/* Sended amount */}
          <InputField
            label="Sended Amount"
            name="sended_amount"
            type="number"
            min={0}
            placeholder="Enter amount"
            value={form.sendedAmount}
            onChange={(e) => setFormField("sendedAmount", e.target.value)}
            required
          />

          <div className="flex items-center gap-2">
            <Button
              type={"submit"}
              label={form.editId ? "Update" : "Save"}
              icon1={<SaveIcon color="#fff" />}
              icon2={<SaveIcon color="#fff" />}
              className={
                "bg-[#4F46E5] hover:bg-[#4338CA] text-white h-max mt-2 w-full"
              }
            />
          </div>
        </div>
      </form>

      {/* ── Table ── */}
      <div className="mt-8 overflow-x-auto">
        <Table borderAxis="both" hoverRow stickyHeader>
          <thead>
            <tr>
              <th style={{ width: "9%" }}>Date</th>
              <th style={{ width: "6%" }}>Bill No</th>
              <th style={{ width: "12%" }}>Customer</th>
              <th style={{ width: "8%" }}>Base Amount</th>
              <th style={{ width: "8%" }}>Tax</th>
              <th style={{ width: "9%" }}>Total Amount</th>
              <th style={{ width: "14%" }}>Sended Bill Nos</th>
              <th style={{ width: "14%" }}>Sended Method</th>
              <th style={{ width: "10%" }}>Sended Amount</th>
              <th style={{ width: "8%" }}>Action</th>
              {role === "superadmin" && (
                <th style={{ width: "12%" }}>Status</th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={role === "superadmin" ? 11 : 10}>
                  <div className="flex justify-center py-6 text-gray-400 text-sm">
                    Loading…
                  </div>
                </td>
              </tr>
            ) : gstSalesData.length === 0 ? (
              <tr>
                <td colSpan={role === "superadmin" ? 11 : 10}>
                  <div className="flex justify-center py-6 text-gray-400 text-sm">
                    No records found.
                  </div>
                </td>
              </tr>
            ) : (
              gstSalesData.map((item) => (
                <tr key={item.documentId}>
                  <td>{dayjs(item.date).format("DD/MM/YYYY")}</td>
                  <td>{item.bill_no || "-"}</td>
                  <td
                    className={`${item.current_status === "status" && "text-red-600"}`}
                  >
                    {item.vendor?.name || "-"}
                  </td>
                  <td>
                    {item.base_amount === 0 || item.base_amount === null
                      ? "-"
                      : formattedAmount(item.base_amount)}
                  </td>
                  <td>
                    {item.tax_amount === 0 || item.tax_amount === null
                      ? "-"
                      : formattedAmount(item.tax_amount)}
                  </td>
                  <td>
                    {item.total_amount === 0 || item.total_amount === null
                      ? "-"
                      : formattedAmount(item.total_amount)}
                  </td>
                  <td>{parseBillNos(item.sended_bill_nos)}</td>
                  <td>{item.sended_method || "-"}</td>
                  <td>
                    {item.sended_amount === 0 || item.sended_amount === null
                      ? "-"
                      : formattedAmount(item.sended_amount)}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <EditButton
                        onClick={() =>
                          item.bill_no
                            ? navigate(
                                `${GSTEXPENSEENTRY}?editId=${item.documentId}`,
                              )
                            : handleEdit(item)
                        }
                      />
                      <DeletePopup handleDelete={() => handleDelete(item)} />
                    </div>
                  </td>
                  {role === "superadmin" && (
                    <td>
                      {item.bill_no ? (
                        <SelectField
                          value={item.current_status || "status"}
                          options={STATUS_OPTIONS}
                          onChange={(e) =>
                            handleStatusChange(item.documentId, e.target.value)
                          }
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>

          {/* ── Pagination footer ── */}
          <tfoot>
            <tr>
              <td colSpan={role === "superadmin" ? 11 : 10}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 2,
                    py: 0.5,
                  }}
                >
                  <FormControl orientation="horizontal" size="sm">
                    <FormLabel>Rows per page:</FormLabel>
                    <Select
                      value={rowsPerPage}
                      onChange={handleChangeRowsPerPage}
                      size="sm"
                    >
                      {ROWS_PER_PAGE_OPTIONS.map((n) => (
                        <Option key={n} value={n}>
                          {n}
                        </Option>
                      ))}
                    </Select>
                  </FormControl>

                  <Typography
                    level="body-sm"
                    sx={{ minWidth: 90, textAlign: "center" }}
                  >
                    {labelDisplayedRows({
                      from: totalCount === 0 ? 0 : page * rowsPerPage + 1,
                      to: rowsTo,
                      count: totalCount,
                    })}
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1 }}>
                    <IconButton
                      size="sm"
                      variant="outlined"
                      disabled={page === 0}
                      onClick={() => handleChangePage(page - 1)}
                      aria-label="Previous page"
                    >
                      <LeftArrowIcon />
                    </IconButton>
                    <IconButton
                      size="sm"
                      variant="outlined"
                      disabled={rowsTo >= totalCount}
                      onClick={() => handleChangePage(page + 1)}
                      aria-label="Next page"
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

      <GstExpenseExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        vendorOptions={customerOptions}
        role={role}
      />
    </MainLayout>
  );
};

export default GstExpenseList;
