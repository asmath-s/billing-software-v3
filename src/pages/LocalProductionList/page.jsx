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
  CashIcon,
  CheckBoxIcon,
  CheckIcon,
  GpayIcon,
  LeftArrowIcon,
  RightIcon,
  SaveIcon,
} from "../../components/icons";
import InputField from "../../components/InputField/InputField";
import SelectField from "../../components/SelectField/SelectField";
import { useAuth } from "../../context/auth-context";
import MainLayout from "../../layouts/MainLayout";
import { setCurrentTime } from "../../utils/DatewithTime";

function labelDisplayedRows({ from, to, count }) {
  return `${from}–${to} of ${count}`;
}

const LocalProductionList = () => {
  const { role, showOverview, toggleOverview } = useAuth();
  const [date, setDate] = useState(new Date());
  const [instruction, setInstruction] = useState("");
  const [customType, setCustomType] = useState("cash");
  const [method, setMethod] = useState("expense");
  const [amount, setAmount] = useState("");
  const [expenseData, setExpenseData] = useState([]);
  const [localExpenseAmount, setLocalExpenseAmount] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const buildQuery = () => {
    const query = [];

    query.push(`pagination[page]=${page + 1}`);
    query.push(`pagination[pageSize]=${rowsPerPage}`);
    query.push(`sort[0]=date:desc`);
    query.push(`filters[approved][$eq]=true`);
    query.push(`filters[current_status][$eq]=production`);

    if (fromDate && toDate) {
      query.push(
        `filters[date][$gte]=${dayjs(fromDate).startOf("day").toISOString()}`,
      );
      query.push(
        `filters[date][$lte]=${dayjs(toDate).endOf("day").toISOString()}`,
      );
    }

    return query.join("&");
  };

  const loadExpenseData = useCallback(async () => {
    setLoading(true);

    try {
      const res = await getLocalExpense(buildQuery());

      setExpenseData(res?.data.data || []);
      setTotalCount(res?.data.meta?.pagination?.total || 0);
    } catch (error) {
      console.error("Local expense fetch failed:", error);
      toast.error("Failed to load local expense list");
      setExpenseData([]);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, fromDate, toDate]);

  const loadLocalTotalAmount = useCallback(async () => {
    setLoading(true);

    try {
      let query = [];

      query.push(`sort[0]=date:desc`);
      query.push(`filters[approved][$eq]=true`);
      query.push(`filters[current_status][$eq]=production`);

      if (fromDate && toDate) {
        query.push(
          `filters[date][$gte]=${dayjs(fromDate).startOf("day").toISOString()}`,
        );
        query.push(
          `filters[date][$lte]=${dayjs(toDate).endOf("day").toISOString()}`,
        );
      }
      const queryString = query.length ? `?${query.join("&")}` : "";

      const res = await getLocalExpenseAmounts(queryString);

      setLocalExpenseAmount(res);
    } catch (error) {
      console.error("Local amounts fetch failed:", error);
      setLocalExpenseAmount([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadExpenseData();
  }, [loadExpenseData]);

  useEffect(() => {
    loadLocalTotalAmount();
  }, [loadLocalTotalAmount]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const basePayload = {
      date,
      instruction,
      method,
      custom_type: customType,
      amount: amount,
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
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save");
    }

    loadExpenseData();

    setEditId("");
    setDate(new Date());
    setInstruction("");
    setMethod("expense");
    setCustomType("cash");
    setAmount(0);
  };

  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (_, value) => {
    setRowsPerPage(value);
    setPage(0);
  };

  const getLabelDisplayedRowsTo = () => {
    return Math.min((page + 1) * rowsPerPage, totalCount);
  };

  const handleDelete = async (id) => {
    try {
      await deleteLocalExpense(id);
      toast.success("Deleted successfully");
      loadExpenseData();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleEdit = (item) => {
    setEditId(item.documentId);
    setDate(new Date(item.date));
    setInstruction(item.instruction);
    setMethod(item.method);
    setCustomType(item.custom_type);
    setAmount(item.amount);
  };

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">Local Production List</h1>
        <Checkbox
          icon={<CheckBoxIcon />}
          checkedIcon={<CheckIcon color="#fff" />}
          checked={showOverview}
          style={{ marginRight: 8 }}
          label={"Show Overview"}
          onChange={() => toggleOverview()}
        />
      </div>

      {showOverview && (
        <motion.div
          className="flex gap-4 items-center justify-start mt-6 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <CardUI
            title="Total Expense Cash"
            amount={localExpenseAmount?.expense_cash}
            icon={<CashIcon color="#292D32" width="34" height="34" />}
            titleColor="text-red-800"
          />
          <CardUI
            title="Total Expense Gpay"
            amount={localExpenseAmount?.expense_gpay}
            icon={<GpayIcon color="#292D32" width="34" height="34" />}
            titleColor="text-red-800"
          />
          <CardUI
            title="Total Received Cash"
            amount={localExpenseAmount?.receive_cash}
            icon={<CashIcon color="#292D32" width="34" height="34" />}
            titleColor="text-green-800"
          />
          <CardUI
            title="Total Received Gpay"
            amount={localExpenseAmount?.receive_gpay}
            icon={<GpayIcon color="#292D32" width="34" height="34" />}
            titleColor="text-green-800"
          />
        </motion.div>
      )}
      <div className="flex gap-4 items-center">
        <Datepicker
          type="multipleDatePicker"
          FromDate={fromDate}
          ToDate={toDate}
          setFromDate={setFromDate}
          setToDate={setToDate}
        />
      </div>
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="grid grid-cols-6 gap-4 ">
          <DateUiPicker
            value={date}
            label="Date"
            onChange={(d) => setDate(setCurrentTime(d))}
            className={"w-full"}
            minDate={role === "superadmin" ? false : new Date()}
          />

          <InputField
            placeholder="Instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            required={true}
          />

          <SelectField
            label={"Method"}
            selectName={"method"}
            options={[
              { value: "expense", label: "Expense" },
              { value: "receive", label: "Receive" },
            ]}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder={"Method"}
            required={true}
          />

          <SelectField
            label={"Received In"}
            selectName={"custom_type"}
            options={[
              { value: "cash", label: "Cash" },
              { value: "gpay", label: "Gpay" },
            ]}
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder={"Received In"}
            required={true}
          />
          <InputField
            name={"received amount"}
            placeholder={"Received Amount"}
            value={amount === 0 ? "" : amount}
            onChange={(e) => setAmount(e.target.value) || 0}
            required={true}
          />
          <div className="flex items-center gap-2">
            <Button
              type={"submit"}
              label={editId ? "Update" : "Save"}
              icon1={<SaveIcon color="#fff" />}
              icon2={<SaveIcon color="#fff" />}
              className={
                "bg-[#4F46E5] hover:bg-[#4338CA] text-white h-max mt-2 w-full"
              }
            />
          </div>
        </div>
      </form>
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
            {expenseData.map((item) => (
              <tr key={item.documentId}>
                <td>{dayjs(item.date).format("DD-MM-YYYY")}</td>
                <td className="w-[10%]">{item.role}</td>
                <td>{item.instruction}</td>
                <td>
                  <span
                    className={`p-1 rounded-md flex justify-center capitalize  ${
                      item.method === "expense"
                        ? "bg-rose-200 text-rose-800"
                        : "bg-[#DAF4F0] text-[#0AB39C]"
                    }`}
                  >
                    {item.method}
                  </span>
                </td>
                <td>
                  <span
                    className={`p-1 rounded-md flex justify-center capitalize  ${
                      item.custom_type === "cash"
                        ? "bg-[#E2E5ED] text-[#405189]"
                        : "bg-stone-200 text-stone-800"
                    }`}
                  >
                    {item.custom_type}
                  </span>
                </td>
                <td>{item.amount}</td>
                <td>
                  <div className="flex gap-2">
                    <EditButton onClick={() => handleEdit(item)} />

                    <DeletePopup
                      handleDelete={() => handleDelete(item.documentId)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={8}>
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
                      <Option value={5}>5</Option>
                      <Option value={10}>10</Option>
                      <Option value={25}>25</Option>
                      <Option value={100}>100</Option>
                    </Select>
                  </FormControl>

                  <Typography textAlign="center" sx={{ minWidth: 80 }}>
                    {labelDisplayedRows({
                      from: totalCount === 0 ? 0 : page * rowsPerPage + 1,
                      to: getLabelDisplayedRowsTo(),
                      count: totalCount,
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
    </MainLayout>
  );
};

export default LocalProductionList;
