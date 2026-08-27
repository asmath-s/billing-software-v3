import { Checkbox, Table } from "@mui/joy";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getCustomers } from "../../api/customer";
import { getLocalAmounts } from "../../api/localAmount";
import {
  deleteLocalList,
  getLocalList,
  updateLocalList,
} from "../../api/localList";
import AutocompleteField from "../../components/AutocompleteField/AutocompleteField";
import Button from "../../components/Button/Button";
import CardUI from "../../components/CardUI/CardUI";
import Datepicker from "../../components/Datepicker/Datepicker";
import DeletePopup from "../../components/DeletePopup/DeletePopup";
import EditButton from "../../components/EditButton/EditButton";
import {
  CashIcon,
  CheckBoxIcon,
  CheckIcon,
  GpayIcon,
  PendingIcon,
} from "../../components/icons";
import SelectField from "../../components/SelectField/SelectField";
import { useAuth } from "../../context/auth-context";
import { useFinancialYear } from "../../context/financial-year-context";
import MainLayout from "../../layouts/MainLayout";
import { LOCALENTRY } from "../../router/paths";
import dayjs from "../../utils/dayjs";
import { resolveApiDateRange } from "../../utils/financialYear";
import { formattedAmount } from "../../utils/FormatAmount";
import { findMatchingEntity } from "../../utils/nameNormalizer";
const LocalList = () => {
  const { role, showOverview, toggleOverview } = useAuth();
  const { fromDate: fyFromDate, toDate: fyToDate } = useFinancialYear();
  const navigate = useNavigate();

  /* ================= STATE ================= */
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [searchCustomer, setSearchCustomer] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [localData, setLocalData] = useState([]);
  const [localAmount, setLocalAmount] = useState([]);
  const [loading, setLoading] = useState(false);

  const [approveDate, setApproveDate] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  /* ================= LOAD CUSTOMERS ================= */
  const loadCustomers = useCallback(async () => {
    try {
      const res = await getCustomers();
      setCustomers(res || []);
    } catch (error) {
      console.error("Customer fetch failed:", error);
      setCustomers([]);
    }
  }, []);

  /* ================= LOAD LOCAL LIST ================= */

  const loadLocalEntriesData = useCallback(async () => {
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
    const query = [];

    query.push("pagination[pageSize]=100000");
    query.push("populate=*");

    if (searchCustomer) {
      query.push(`filters[customer][documentId][$eq]=${searchCustomer.value}`);
    }

    if (from && to) {
      query.push(`fromDate=${from}`);
      query.push(`toDate=${to}`);
    }

    query.push("sort[0]=date:desc");
    query.push("filters[approved][$eq]=false");

    const queryString = query.length ? `?${query.join("&")}` : "";

    try {
      const res = await getLocalList(queryString);
      setLocalData(res.data || []);
    } catch (error) {
      console.error("Local list fetch failed:", error);
      setLocalData([]);
    } finally {
      setLoading(false);
    }
  }, [searchCustomer, fromDate, toDate, fyFromDate, fyToDate]);

  /* ================= LOAD LOCAL AMOUNTS ================= */

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

    setLoading(true);
    try {
      const query = [];

      if (searchCustomer) {
        query.push(
          `filters[customer][documentId][$eq]=${searchCustomer.value}`,
        );
      }

      if (from && to) {
        query.push(`fromDate=${from}`);
        query.push(`toDate=${to}`);
      }

      const queryString = query.length ? `?${query.join("&")}` : "";

      const res = await getLocalAmounts(queryString);

      setLocalAmount(res || {});
    } catch (error) {
      console.error("Local amounts fetch failed:", error);
      setLocalAmount({});
    } finally {
      setLoading(false);
    }
  }, [searchCustomer, fromDate, toDate, fyFromDate, fyToDate]);

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    loadLocalEntriesData();
  }, [loadLocalEntriesData]);

  useEffect(() => {
    if (showOverview) {
      loadLocalTotalAmount();
    }
  }, [loadLocalTotalAmount, showOverview]);

  /* ================= FILTER + GROUP ================= */

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        label: c.name,
        value: c.documentId,
      })),
    [customers],
  );

  const groupedData = useMemo(() => {
    if (!localData?.length) return {};

    const isWithinDateRange = (date) => {
      if (!fromDate || !toDate) return true;
      const d = dayjs(date);
      return d.isBetween(dayjs(fromDate), dayjs(toDate), "day", "[]");
    };

    const filtered = localData.filter((item) => {
      const customerMatch =
        !searchCustomer || item?.customer?.documentId === searchCustomer.value;

      const dateMatch =
        isWithinDateRange(item.date) ||
        item.cash?.some((c) => isWithinDateRange(c.date)) ||
        item.gpay?.some((g) => isWithinDateRange(g.date));

      return customerMatch && dateMatch;
    });

    const grouped = filtered.reduce((acc, item) => {
      const key = dayjs(item.date).format("YYYY-MM-DD");

      if (!acc[key]) acc[key] = [];

      acc[key].push(item);

      return acc;
    }, {});

    return grouped;
  }, [localData, searchCustomer, fromDate, toDate]);

  /* ================= DELETE ================= */

  const handleDelete = async (deleteId) => {
    // Optimistic UI
    setLocalData((prev) => prev.filter((item) => item.documentId !== deleteId));

    try {
      await deleteLocalList(deleteId);

      toast.success("You have successfully deleted Local Sales");
    } catch (error) {
      console.error("Error deleting local Sales:", error);

      // Restore data from server if delete failed
      await loadLocalEntriesData();

      toast.error("Failed to delete Local Sales");
    }
  };

  /* ================= STATUS CHANGE ================= */
  const handleStatusChange = async (id, value) => {
    // Optimistic UI update
    setLocalData((prev) =>
      prev.map((item) =>
        item.documentId === id ? { ...item, current_status: value } : item,
      ),
    );

    try {
      await updateLocalList(id, {
        current_status: value,
      });
    } catch (error) {
      console.error("Status update failed:", error);

      // Reload only if update failed
      await loadLocalEntriesData();

      toast.error("Failed to update status. Please try again.");
    }
  };

  /* ================= APPROVAL ================= */
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
      const items = groupedData[approveDate];

      await Promise.all(
        items.map((item) =>
          updateLocalList(item.documentId, {
            current_status: item.current_status,
            approved: true,
          }),
        ),
      );

      setLocalData((prev) =>
        prev.filter(
          (item) =>
            !items.some((approved) => approved.documentId === item.documentId),
        ),
      );

      toast.success("Local list approved successfully!");
      setConfirmOpen(false);
    } catch (error) {
      console.error("Approval failed:", error);
      toast.error("Failed to approve local list. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const balanceTotal = groupedData[approveDate]?.reduce(
    (total, item) => total + item.balance_amount,
    0,
  );

  /* ================= RENDER ================= */
  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">Local List</h1>
        {role !== "authenticated" && (
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

      {showOverview && (
        <motion.div
          className="flex gap-4 items-center justify-start mt-6 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <CardUI
            title="Total Cash"
            amount={localAmount?.local_list?.total_cash}
            icon={<CashIcon color="#292D32" width="34" height="34" />}
            titleColor="text-green-800"
          />
          <CardUI
            title="Total Gpay"
            amount={localAmount?.local_list?.total_gpay}
            icon={<GpayIcon color="#292D32" width="34" height="34" />}
            titleColor="text-green-800"
          />
          <CardUI
            title="Total Balance"
            amount={localAmount?.local_list?.total_balance}
            icon={<PendingIcon color="#292D32" width="34" height="34" />}
            titleColor="text-red-500"
          />
        </motion.div>
      )}

      {/* Filters */}
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
          <AutocompleteField
            label="Customer Name"
            value={searchCustomer}
            options={customerOptions}
            onChange={(e, val) => {
              const resolved =
                typeof val === "string"
                  ? findMatchingEntity(val, customerOptions, "label") || val
                  : val;
              setSearchCustomer(resolved);
            }}
          />
        </div>
      </div>

      {/* Tables */}
      {Object.keys(groupedData).map((date) => {
        const groupItems = groupedData[date] || [];
        const groupTotalCash = groupItems.reduce(
          (sum, item) =>
            sum +
            (item.cash || []).reduce(
              (cSum, c) => cSum + (Number(c.amount) || 0),
              0,
            ),
          0,
        );
        const groupTotalGpay = groupItems.reduce(
          (sum, item) =>
            sum +
            (item.gpay || []).reduce(
              (gSum, g) => gSum + (Number(g.amount) || 0),
              0,
            ),
          0,
        );

        return (
          <div key={date} className="mt-8">
            <div className="flex flex-wrap justify-between items-center mb-2 gap-3">
              <h2 className="text-lg font-semibold text-gray-800">
                Date: {dayjs(date).format("DD/MM/YYYY")}
              </h2>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-green-50 text-green-800 border border-green-200 px-3 py-1 rounded-lg text-sm shadow-xs">
                  <CashIcon width="18" height="18" color="#166534" />
                  <span className="font-medium text-xs text-green-700">Total Cash:</span>
                  <span className="font-bold">₹ {formattedAmount(groupTotalCash)}</span>
                </div>

                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-lg text-sm shadow-xs">
                  <GpayIcon width="18" height="18" color="#1e40af" />
                  <span className="font-medium text-xs text-blue-700">Total GPay:</span>
                  <span className="font-bold">₹ {formattedAmount(groupTotalGpay)}</span>
                </div>
              </div>
            </div>

            <Table borderAxis="both" hoverRow>
            <thead>
              <tr>
                <th className="w-[10%]">Customer</th>
                <th className="w-[11%]">Phone</th>
                <th className="w-[30%]">Particulars</th>
                <th className="w-[7%]">Total</th>
                <th className="w-[14%]">Cash</th>
                <th className="w-[16%]">GPay</th>
                <th className="w-[7%]">Balance</th>
                <th className="w-[10%]">Action</th>
                {role === "superadmin" && <th className="w-[10%]">Status</th>}
              </tr>
            </thead>
            <tbody>
              {groupedData[date].map((item) => (
                <tr key={item.documentId}>
                  <td>{item.customer?.name || "-"}</td>
                  <td>{item.customer?.phonenumber || "-"}</td>
                  <td>
                    {item.particulars.map((p, index) => (
                      <div key={index}>{p.text}</div>
                    ))}
                  </td>

                  <td>{formattedAmount(item.total_amount)}</td>
                  <td>
                    {item.cash?.length === 0
                      ? "-"
                      : item.cash?.map((c) => (
                          <div key={c.id}>
                            {dayjs(c.date).format("DD/MM/YY")} -{" "}
                            {formattedAmount(c.amount)}
                          </div>
                        ))}
                  </td>
                  <td>
                    {item.gpay?.length === 0
                      ? "-"
                      : item.gpay?.map((g) => (
                          <div key={g.id} className="flex gap-1">
                            <Checkbox />
                            {dayjs(g.date).format("DD/MM/YY")} -{" "}
                            {formattedAmount(g.amount)}
                          </div>
                        ))}
                  </td>
                  <td className={item.balance_amount > 0 ? "text-red-500" : ""}>
                    {formattedAmount(item.balance_amount)}
                  </td>

                  <td>
                    <div className="flex gap-2">
                      <EditButton
                        onClick={() =>
                          navigate(
                            `${LOCALENTRY}?editId=${item.documentId}&screenFrom=localList`,
                          )
                        }
                      />
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
                          { value: "paid", label: "Paid" },
                          { value: "pending", label: "Pending" },
                          { value: "party", label: "Party" },
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
                disabled={loading}
              />
            </div>
          )}
        </div>
      );
    })}

      {/* Confirm Popup */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-3">Confirm Approval</h3>
            <p>Are you sure you want to approve this group?</p>
            <p
              className={`mt-3 ${balanceTotal > 0 ? "text-red-500 font-semibold" : ""}`}
            >
              Balance amount: {formattedAmount(balanceTotal)}
            </p>

            <div className="flex gap-3 mt-4">
              <Button
                label="Confirm"
                onClick={handleApproveConfirm}
                className="w-full hover:bg-green-600 border-green-600 text-green-600"
                disabled={loading}
              />
              <Button
                label="Cancel"
                onClick={() => setConfirmOpen(false)}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default LocalList;
