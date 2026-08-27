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
import dayjs from "dayjs";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import {
  createLocalExpense,
  deleteLocalExpense,
  getLocalExpense,
  getLocalExpenseAmounts,
  updateLocalExpense,
} from "../../api/localExpense";

import Button from "../../components/Button/Button";
import CardUI from "../../components/CardUI/CardUI";
import Datepicker, {
  DateUiPicker,
} from "../../components/Datepicker/Datepicker";
import DeletePopup from "../../components/DeletePopup/DeletePopup";
import EditButton from "../../components/EditButton/EditButton";

import {
  AccountIcon,
  CashIcon,
  CheckBoxIcon,
  CheckIcon,
  GpayIcon,
  LeftArrowIcon,
  RightIcon,
  SaveIcon,
  SavePdfIcon,
} from "../../components/icons";
import LocalExpenseExportModal from "../../components/LocalExpenseExportModal/LocalExpenseExportModal";

import InputField from "../../components/InputField/InputField";
import SelectField from "../../components/SelectField/SelectField";
import { useAuth } from "../../context/auth-context";
import { useFinancialYear } from "../../context/financial-year-context";
import MainLayout from "../../layouts/MainLayout";
import { setCurrentTime } from "../../utils/DatewithTime";
import { resolveApiDateRange } from "../../utils/financialYear";

function labelDisplayedRows({ from, to, count }) {
  return `${from}–${to} of ${count}`;
}

const LocalProductionList = () => {
  const { role, showOverview, toggleOverview } = useAuth();
  const { fromDate: fyFromDate, toDate: fyToDate } = useFinancialYear();

  // Form state
  const [date, setDate] = useState(new Date());
  const [instruction, setInstruction] = useState("");
  const [searchInstruction, setSearchInstruction] = useState("");
  const [customType, setCustomType] = useState("cash");
  const [method, setMethod] = useState("expense");
  const [amount, setAmount] = useState("");

  // Data state
  const [expenseData, setExpenseData] = useState([]);
  const [localExpenseAmount, setLocalExpenseAmount] = useState([]);

  // Edit state
  const [editId, setEditId] = useState("");

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Date filter state
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  /**
   * Build the API query for the production expense list.
   */
  const buildQuery = useCallback(() => {
    const { shouldFetch, from, to } = resolveApiDateRange(
      fromDate,
      toDate,
      fyFromDate,
      fyToDate,
    );

    if (!shouldFetch) {
      return null;
    }

    const query = [
      `pagination[page]=${page + 1}`,
      `pagination[pageSize]=${rowsPerPage}`,
      `sort[0]=date:desc`,
      `filters[approved][$eq]=true`,
      `filters[current_status][$eq]=production`,
    ];

    // Search by instruction
    if (searchInstruction.trim()) {
      query.push(
        `filters[instruction][$containsi]=${encodeURIComponent(
          searchInstruction.trim(),
        )}`,
      );
    }

    if (from && to) {
      query.push(
        `filters[date][$gte]=${dayjs(from).format("YYYY-MM-DD")}`,
        `filters[date][$lte]=${dayjs(to).format("YYYY-MM-DD")}`,
      );
    }

    return query.join("&");
  }, [page, rowsPerPage, fromDate, toDate, fyFromDate, fyToDate, searchInstruction]);

  /**
   * Load production expense list.
   */
  const loadExpenseData = useCallback(async () => {
    const queryString = buildQuery();
    if (queryString === null) {
      return;
    }

    try {
      const res = await getLocalExpense(queryString);

      const data = res?.data?.data || [];
      const total = res?.data?.meta?.pagination?.total || 0;

      setExpenseData(data);
      setTotalCount(total);
    } catch (error) {
      console.error("Local expense fetch failed:", error);

      toast.error("Failed to load local expense list");

      setExpenseData([]);
      setTotalCount(0);
    }
  }, [buildQuery]);

  /**
   * Load overview totals.
   */
  const loadLocalTotalAmount = useCallback(async () => {
    const { shouldFetch, from, to } = resolveApiDateRange(
      fromDate,
      toDate,
      fyFromDate,
      fyToDate,
    );

    if (!shouldFetch) {
      return;
    }

    try {
      const query = [];

      if (from && to) {
        query.push(`fromDate=${from}`);
        query.push(`toDate=${to}`);
      }

      if (searchInstruction.trim()) {
        query.push(
          `filters[instruction][$containsi]=${encodeURIComponent(
            searchInstruction.trim(),
          )}`,
        );
      }

      const queryString = query.length ? `?${query.join("&")}` : "";

      const res = await getLocalExpenseAmounts(queryString);

      setLocalExpenseAmount(res || []);
    } catch (error) {
      console.error("Local amounts fetch failed:", error);

      setLocalExpenseAmount([]);
    }
  }, [fromDate, toDate, fyFromDate, fyToDate, searchInstruction]);

  /**
   * Reload list whenever pagination or date filters change.
   */
  useEffect(() => {
    loadExpenseData();
  }, [loadExpenseData]);

  /**
   * Reload overview totals whenever date filters change.
   */
  useEffect(() => {
    if (showOverview) {
      loadLocalTotalAmount();
    }
  }, [loadLocalTotalAmount, showOverview]);

  /**
   * Submit create/update form.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const basePayload = {
      date,
      instruction,
      method,
      custom_type: customType,
      amount,
      approved: true,
      current_status: "production",
    };

    try {
      if (editId) {
        await updateLocalExpense(editId, basePayload);

        toast.success("Local expense updated successfully");
      } else {
        await createLocalExpense({
          ...basePayload,
          role,
        });

        toast.success("Local expense created successfully");
      }

      // Refresh the list after successful save/update.
      await loadExpenseData();

      // Refresh overview totals too.
      await loadLocalTotalAmount();

      // Reset form.
      setEditId("");
      setDate(new Date());
      setInstruction("");
      setMethod("expense");
      setCustomType("cash");
      setAmount("");
    } catch (error) {
      console.error("Save failed:", error);

      toast.error("Failed to save");
    }
  };

  /**
   * Change current page.
   */
  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  /**
   * Change rows per page.
   */
  const handleChangeRowsPerPage = (_, value) => {
    if (!value) return;

    setRowsPerPage(value);
    setPage(0);
  };

  /**
   * Calculate last visible row.
   */
  const getLabelDisplayedRowsTo = () => {
    return Math.min((page + 1) * rowsPerPage, totalCount);
  };

  /**
   * Delete expense.
   */
  const handleDelete = async (id) => {
    try {
      await deleteLocalExpense(id);

      toast.success("Deleted successfully");

      // Refresh list and totals after deletion.
      await loadExpenseData();
      await loadLocalTotalAmount();
    } catch (error) {
      console.error("Delete failed:", error);

      toast.error("Failed to delete");
    }
  };

  /**
   * Populate form for editing.
   */
  const handleEdit = (item) => {
    setEditId(item.documentId);
    setDate(new Date(item.date));
    setInstruction(item.instruction || "");
    setMethod(item.method || "expense");
    setCustomType(item.custom_type || "cash");
    setAmount(item.amount ?? "");
  };

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">Local Production List</h1>

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
              style={{ marginRight: 8 }}
              label="Show Overview"
              onChange={() => toggleOverview()}
            />
          )}
        </div>
      </div>

      {/* Overview */}
      {showOverview && (
        <motion.div
          className="grid grid-cols-3 gap-4 mt-6 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{
            duration: 0.5,
            ease: "easeInOut",
          }}
        >
          <CardUI
            title="Total Expense Cash"
            amount={localExpenseAmount?.production?.total_exp_cash}
            icon={<CashIcon color="#292D32" width="34" height="34" />}
            titleColor="text-red-800"
            className="w-full"
          />

          <CardUI
            title="Total Expense Gpay"
            amount={localExpenseAmount?.production?.total_exp_gpay}
            icon={<GpayIcon color="#292D32" width="34" height="34" />}
            titleColor="text-red-800"
            className="w-full"
          />

          <CardUI
            title="Total Expense Account"
            amount={localExpenseAmount?.production?.total_exp_account}
            icon={<AccountIcon color="#292D32" width="34" height="34" />}
            titleColor="text-red-800"
            className="w-full"
          />

          <CardUI
            title="Total Received Cash"
            amount={localExpenseAmount?.production?.total_rec_cash}
            icon={<CashIcon color="#292D32" width="34" height="34" />}
            titleColor="text-green-800"
            className="w-full"
          />

          <CardUI
            title="Total Received Gpay"
            amount={localExpenseAmount?.production?.total_rec_gpay}
            icon={<GpayIcon color="#292D32" width="34" height="34" />}
            titleColor="text-green-800"
            className="w-full"
          />

          <CardUI
            title="Total Received Account"
            amount={localExpenseAmount?.production?.total_rec_account}
            icon={<AccountIcon color="#292D32" width="34" height="34" />}
            titleColor="text-green-800"
            className="w-full"
          />
        </motion.div>
      )}

      {/* Date Filter */}
      <div className="flex gap-4 items-center">
        <Datepicker
          type="multipleDatePicker"
          FromDate={fromDate}
          ToDate={toDate}
          setFromDate={setFromDate}
          setToDate={setToDate}
        />
      </div>
      <div className="flex justify-end mt-6">
        <div className="w-80">
          <input
            type="text"
            placeholder="Search by instruction"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none "
            value={searchInstruction}
            onChange={(e) => {
              setSearchInstruction(e.target.value);
              setPage(0);
            }}
          />
        </div>
      </div>

      {/* Add / Edit Form */}
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="grid grid-cols-6 gap-4">
          <DateUiPicker
            value={date}
            label="Date"
            onChange={(d) => setDate(setCurrentTime(d))}
            className="w-full"
            minDate={role === "superadmin" ? undefined : new Date()}
          />

          <InputField
            placeholder="Instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            required
          />

          <SelectField
            label="Method"
            selectName="method"
            options={[
              {
                value: "expense",
                label: "Expense",
              },
              {
                value: "receive",
                label: "Receive",
              },
            ]}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="Method"
            required
          />

          <SelectField
            label="Received In"
            selectName="custom_type"
            options={[
              {
                value: "cash",
                label: "Cash",
              },
              {
                value: "gpay",
                label: "Gpay",
              },
              {
                value: "account",
                label: "Account",
              },
            ]}
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder="Received In"
            required
          />

          <InputField
            name="received amount"
            placeholder="Received Amount"
            value={amount === 0 ? "" : amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              label={editId ? "Update" : "Save"}
              icon1={<SaveIcon color="#fff" />}
              icon2={<SaveIcon color="#fff" />}
              className="bg-[#4F46E5] hover:bg-[#4338CA] text-white h-max mt-2 w-full"
            />
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="mt-8">
        <Table borderAxis="both" hoverRow>
          <thead>
            <tr>
              <th className="w-[10%]">Date</th>
              <th className="w-[10%]">Role</th>
              <th className="w-[30%]">Instruction</th>
              <th className="w-[15%]">Method</th>
              <th className="w-[10%]">Custom Type</th>
              <th className="w-[17%]">Amount</th>
              <th className="w-[18%]">Action</th>
            </tr>
          </thead>

          <tbody>
            {expenseData.length > 0 ? (
              expenseData.map((item) => (
                <tr key={item.documentId}>
                  <td>
                    {item.date ? dayjs(item.date).format("DD-MM-YYYY") : "-"}
                  </td>

                  <td className="w-[10%]">{item.role || "-"}</td>

                  <td>{item.instruction || "-"}</td>

                  <td>
                    <span
                      className={`p-1 rounded-md flex justify-center capitalize ${
                        item.method === "expense"
                          ? "bg-rose-200 text-rose-800"
                          : "bg-[#DAF4F0] text-[#0AB39C]"
                      }`}
                    >
                      {item.method || "-"}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`p-1 rounded-md flex justify-center capitalize ${
                        item.custom_type === "cash"
                          ? "bg-[#E2E5ED] text-[#405189]"
                          : "bg-stone-200 text-stone-800"
                      }`}
                    >
                      {item.custom_type || "-"}
                    </span>
                  </td>

                  <td>{item.amount ?? 0}</td>

                  <td>
                    <div className="flex gap-2">
                      <EditButton onClick={() => handleEdit(item)} />

                      <DeletePopup
                        handleDelete={() => handleDelete(item.documentId)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-6">
                  No production expenses found
                </td>
              </tr>
            )}
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={7}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 2,
                  }}
                >
                  {/* Rows per page */}
                  <FormControl orientation="horizontal" size="sm">
                    <FormLabel>Rows per page:</FormLabel>

                    <Select
                      value={rowsPerPage}
                      onChange={handleChangeRowsPerPage}
                    >
                      <Option value={5}>5</Option>
                      <Option value={10}>10</Option>
                      <Option value={25}>25</Option>
                      <Option value={100}>100</Option>
                    </Select>
                  </FormControl>

                  {/* Pagination text */}
                  <Typography
                    textAlign="center"
                    sx={{
                      minWidth: 80,
                    }}
                  >
                    {labelDisplayedRows({
                      from: totalCount === 0 ? 0 : page * rowsPerPage + 1,
                      to: getLabelDisplayedRowsTo(),
                      count: totalCount,
                    })}
                  </Typography>

                  {/* Pagination buttons */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                    }}
                  >
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
                      disabled={getLabelDisplayedRowsTo() >= totalCount}
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

      <LocalExpenseExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        sectionTitle="Local Expense – Production"
        status="production"
      />
    </MainLayout>
  );
};

export default LocalProductionList;
