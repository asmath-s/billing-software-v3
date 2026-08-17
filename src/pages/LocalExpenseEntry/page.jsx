import { Checkbox, Table } from "@mui/joy";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import {
  createLocalExpense,
  deleteLocalExpense,
  getLocalExpense,
  getLocalExpenseAmounts,
  updateLocalExpense,
} from "../../api/localExpense";

import { createAdminExpense } from "../../api/adminExpense";
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
  SaveIcon,
} from "../../components/icons";
import InputField from "../../components/InputField/InputField";
import SelectField from "../../components/SelectField/SelectField";
import { useAuth } from "../../context/auth-context";
import MainLayout from "../../layouts/MainLayout";
import { capitalizeFirstLetter } from "../../utils/Captialize";
import { setCurrentTime } from "../../utils/DatewithTime";

const LocalExpenseEntry = () => {
  const { role, showOverview, toggleOverview } = useAuth();

  const [date, setDate] = useState(new Date());
  const [instruction, setInstruction] = useState("");
  const [customType, setCustomType] = useState("cash");
  const [method, setMethod] = useState("expense");
  const [amount, setAmount] = useState("");

  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const [expenseData, setExpenseData] = useState([]);
  const [localExpenseAmount, setLocalExpenseAmount] = useState([]);

  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState("");

  // ✅ APPROVE STATES
  const [approveDate, setApproveDate] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  /* ================= LOAD DATA ================= */

  const loadExpenseData = useCallback(async () => {
    const query = [];
    query.push(`sort[0]=date:desc`);
    query.push(`filters[approved][$eq]=false`);

    if (fromDate && toDate) {
      query.push(
        `filters[date][$gte]=${dayjs(fromDate).startOf("day").toISOString()}`,
      );
      query.push(
        `filters[date][$lte]=${dayjs(toDate).endOf("day").toISOString()}`,
      );
    }
    const pageSize = 100;
    let page = 1;
    let pageCount = 1;
    let allData = [];

    setLoading(true);
    try {
      do {
        const params = [
          `pagination[page]=${page}`,
          `pagination[pageSize]=${pageSize}`,
          ...query,
        ].join("&");

        const res = await getLocalExpense(params);
        console.log(res.data);

        allData.push(...(res.data.data || []));
        pageCount = res.data.meta.pagination.pageCount;

        page++;
      } while (page <= pageCount);

      setExpenseData(allData);
    } catch (error) {
      console.error("Local expense fetch failed:", error);
      toast.error("Failed to load local expense list");
      setExpenseData([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  const loadLocalTotalAmount = useCallback(async () => {
    setLoading(true);

    try {
      const query = [];

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

  /* ================= GROUP BY DATE ================= */

  const groupedData = useMemo(() => {
    if (!expenseData?.length) return {};

    return expenseData.reduce((acc, item) => {
      const key = dayjs(item.date).format("YYYY-MM-DD");

      if (!acc[key]) acc[key] = [];
      acc[key].push(item);

      return acc;
    }, {});
  }, [expenseData]);

  /* ================= FORM SUBMIT ================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    const basePayload = {
      date,
      instruction,
      method,
      custom_type: customType,
      amount: amount,
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

  /* ================= DELETE ================= */

  const handleDelete = async (id) => {
    try {
      await deleteLocalExpense(id);
      toast.success("Deleted successfully");
      loadExpenseData();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  /* ================= EDIT ================= */

  const handleEdit = (item) => {
    setEditId(item.documentId);
    setDate(new Date(item.date));
    setInstruction(item.instruction);
    setMethod(item.method);
    setCustomType(item.custom_type);
    setAmount(item.amount);
  };

  /* ================= STATUS ================= */

  const handleStatusChange = useCallback(async (id, value) => {
    let previousStatus;

    // ⚡ Instant UI update
    setExpenseData((prev) =>
      prev.map((item) => {
        if (item.documentId === id) {
          previousStatus = item.current_status;

          return {
            ...item,
            current_status: value,
          };
        }

        return item;
      }),
    );

    try {
      // Background API update
      await updateLocalExpense(id, {
        current_status: value,
      });
    } catch (error) {
      console.error("Status update failed:", error);

      // Rollback UI if API fails
      setExpenseData((prev) =>
        prev.map((item) =>
          item.documentId === id
            ? {
                ...item,
                current_status: previousStatus,
              }
            : item,
        ),
      );

      toast.error("Failed to update status");
    }
  }, []);

  /* ================= APPROVE ================= */

  const handleApproveClick = (date) => {
    const group = groupedData[date];

    const invalid = group.some(
      (item) => !item.current_status || item.current_status === "status",
    );

    if (invalid) {
      toast.error("All status must be selected before approval.");
      return;
    }

    setApproveDate(date);
    setConfirmOpen(true);
  };

  const handleApproveConfirm = async () => {
    setLoading(true);

    try {
      for (const item of groupedData[approveDate]) {
        if (item.current_status === "admin") {
          // eslint-disable-next-line no-unused-vars
          const { id, documentId, publishedAt, updatedAt, createdAt, ...rest } =
            item;
          rest.approved = true;
          await createAdminExpense(rest);
          await deleteLocalExpense(item.documentId);
        } else {
          await updateLocalExpense(item.documentId, {
            current_status: item.current_status,
            approved: true,
          });
        }
      }

      await loadExpenseData();
      toast.success("Approved successfully!");
      setConfirmOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Approval failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">Local Expense List</h1>
        {role === "superadmin" && (
          <Checkbox
            icon={<CheckBoxIcon />}
            checkedIcon={<CheckIcon color="#fff" />}
            checked={showOverview}
            style={{ marginRight: 8 }}
            label={"Show Overview"}
            onChange={() => toggleOverview()}
          />
        )}
      </div>

      {showOverview && role === "superadmin" && (
        <motion.div
          className="flex gap-4 items-center justify-start mt-6 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <CardUI
            title="Total Expense Cash"
            amount={localExpenseAmount?.expense?.total_exp_cash}
            icon={<CashIcon color="#292D32" width="34" height="34" />}
            titleColor="text-red-800"
          />
          <CardUI
            title="Total Expense Gpay"
            amount={localExpenseAmount?.expense?.total_exp_gpay}
            icon={<GpayIcon color="#292D32" width="34" height="34" />}
            titleColor="text-red-800"
          />
          <CardUI
            title="Total Received Cash"
            amount={localExpenseAmount?.expense?.total_rec_cash}
            icon={<CashIcon color="#292D32" width="34" height="34" />}
            titleColor="text-green-800"
          />
          <CardUI
            title="Total Received Gpay"
            amount={localExpenseAmount?.expense?.total_rec_gpay}
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
      {/* FORM */}
      <form onSubmit={handleSubmit} className="mt-10">
        <div
          className={`grid ${role === "superadmin" ? "grid-cols-6" : "grid-cols-5"} gap-4 `}
        >
          {role === "superadmin" && (
            <DateUiPicker
              value={date}
              label="Date"
              onChange={(d) => setDate(setCurrentTime(d))}
              className={"w-full"}
              minDate={role === "superadmin" ? false : new Date()}
            />
          )}
          <InputField
            placeholder="Instruction"
            value={instruction}
            onChange={(e) =>
              setInstruction(capitalizeFirstLetter(e.target.value))
            }
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
            label={"Expense In"}
            selectName={"custom_type"}
            options={[
              { value: "cash", label: "Cash" },
              { value: "gpay", label: "Gpay" },
            ]}
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder={"Expense In"}
            required={true}
          />

          <InputField
            name={"Expense amount"}
            placeholder={"Expense Amount"}
            value={amount === 0 ? "" : amount}
            onChange={(e) => setAmount(e.target.value)}
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

      {/* TABLES */}
      {Object.keys(groupedData).map((date) => (
        <div key={date} className="mt-8">
          <h2 className="text-lg font-semibold mb-2">
            Date: {dayjs(date).format("DD/MM/YYYY")}
          </h2>

          <Table borderAxis="both" hoverRow>
            <thead>
              <tr>
                <th className="w-[20%]">Instruction</th>
                <th className="w-[15%]">Method</th>
                <th className="w-[10%]">Custom Type</th>
                <th className="w-[17%]">Amount</th>
                <th className="w-[15%]">Action</th>
                {role === "superadmin" && <th className="w-[15%]">Status</th>}
              </tr>
            </thead>

            <tbody>
              {groupedData[date].map((item) => (
                <tr key={item.documentId}>
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
                  {role === "superadmin" && (
                    <td>
                      <SelectField
                        value={item.current_status || "status"}
                        options={[
                          { value: "status", label: "Status" },
                          { value: "approved", label: "Approve" },
                          { value: "admin", label: "Admin" },
                          { value: "production", label: "Production" },
                          { value: "hub", label: "Hub" },
                        ]}
                        onChange={(e) =>
                          handleStatusChange(item.documentId, e.target.value)
                        }
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>

          {role === "superadmin" && (
            <div className="flex justify-end mt-4">
              <Button
                label="Approve"
                onClick={() => handleApproveClick(date)}
              />
            </div>
          )}
        </div>
      ))}

      {/* CONFIRM POPUP */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-3">Confirm Approval</h3>

            <div className="flex gap-3 mt-4">
              <Button
                label="Confirm"
                onClick={handleApproveConfirm}
                disabled={loading}
              />
              <Button label="Cancel" onClick={() => setConfirmOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default LocalExpenseEntry;
