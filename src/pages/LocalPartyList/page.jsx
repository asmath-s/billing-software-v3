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
import { getCustomers } from "../../api/customer";
import AutocompleteField from "../../components/AutocompleteField/AutocompleteField";
import CardUI from "../../components/CardUI/CardUI";
import Datepicker, {
  DateUiPicker,
} from "../../components/Datepicker/Datepicker";
import DeletePopup from "../../components/DeletePopup/DeletePopup";
import EditButton from "../../components/EditButton/EditButton";

import MainLayout from "../../layouts/MainLayout";

import { LOCALENTRY } from "../../router/paths";
import dayjs from "../../utils/dayjs";
import { resolveApiDateRange } from "../../utils/financialYear";
import { formattedAmount } from "../../utils/FormatAmount";
import { findMatchingEntity } from "../../utils/nameNormalizer";

import { getLocalAmounts } from "../../api/localAmount";
import {
  createLocalList,
  deleteLocalList,
  getLocalList,
  updateLocalList,
} from "../../api/localList";
import Button from "../../components/Button/Button";
import {
  CashIcon,
  CheckBoxIcon,
  CheckIcon,
  GpayIcon,
  PendingIcon,
  SaveIcon,
  SavePdfIcon,
} from "../../components/icons";
import LocalSalesExportModal from "../../components/LocalSalesExportModal/LocalSalesExportModal";
import LeftArrowIcon from "../../components/icons/LeftArrowIcon";
import RightIcon from "../../components/icons/RightIcon";
import InputField from "../../components/InputField/InputField";
import SelectField from "../../components/SelectField/SelectField";
import { useAuth } from "../../context/auth-context";
import { useFinancialYear } from "../../context/financial-year-context";
import { setCurrentTime } from "../../utils/DatewithTime";

function labelDisplayedRows({ from, to, count }) {
  return `${from}–${to} of ${count}`;
}

const LocalPartyList = () => {
  const { role, showOverview, toggleOverview } = useAuth();
  const { fromDate: fyFromDate, toDate: fyToDate } = useFinancialYear();
  const navigate = useNavigate();

  /* ================= STATE ================= */

  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [searchCustomer, setSearchCustomer] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [localData, setLocalData] = useState([]);
  const [localAmount, setLocalAmount] = useState([]);

  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  const [date, setDate] = useState(setCurrentTime(new Date()));
  const [customType, setCustomType] = useState("gpay");
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [editId, setEditId] = useState("");
  const [particulars, setParticulars] = useState("");

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

  /* ================= API QUERY BUILDER ================= */

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

    const query = [];
    query.push("populate=*");
    query.push(`pagination[page]=${page + 1}`);
    query.push(`pagination[pageSize]=${rowsPerPage}`);
    query.push(`sort[0]=date:desc`);
    query.push(`filters[current_status][$eq]=party`);
    query.push(`filters[approved][$eq]=true`);

    if (searchCustomer?.value) {
      query.push(`filters[customer][documentId][$eq]=${searchCustomer.value}`);
    }

    if (from && to) {
      const startDate = dayjs(from).format("YYYY-MM-DD");
      const endDate = dayjs(to).format("YYYY-MM-DD");

      query.push(`filters[$or][0][date][$gte]=${startDate}`);
      query.push(`filters[$or][0][date][$lte]=${endDate}`);
      query.push(`filters[$or][1][gpay][date][$gte]=${startDate}`);
      query.push(`filters[$or][1][gpay][date][$lte]=${endDate}`);
      query.push(`filters[$or][2][cash][date][$gte]=${startDate}`);
      query.push(`filters[$or][2][cash][date][$lte]=${endDate}`);
    }

    return `?${query.join("&")}`;
  }, [page, rowsPerPage, searchCustomer, fromDate, toDate, fyFromDate, fyToDate]);

  /* ================= LOAD DATA ================= */

  const loadLocalPartyData = useCallback(async () => {
    const queryString = buildQuery();
    if (queryString === null) {
      return;
    }

    setLoading(true);

    try {
      const res = await getLocalList(queryString);

      setLocalData(res?.data || []);
      setTotalCount(res?.meta?.pagination?.total || 0);
    } catch (error) {
      console.error("Local party fetch failed:", error);
      toast.error("Failed to load local party list");
      setLocalData([]);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

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

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        label: c.name,
        value: c.documentId,
      })),
    [customers],
  );

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    loadLocalPartyData();
  }, [loadLocalPartyData]);

  useEffect(() => {
    if (showOverview) {
      loadLocalTotalAmount();
    }
  }, [loadLocalTotalAmount, showOverview]);
  /* ================= DELETE ================= */

  const handleDelete = async (id) => {
    try {
      await deleteLocalList(id);
      toast.success("Deleted successfully");
      loadLocalPartyData();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  /* ================= PAGINATION ================= */

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      date,
      customer: searchCustomer.value,
      particulars: [{ text: particulars }],

      cash:
        customType === "cash"
          ? [
              {
                date,
                amount: Number(receivedAmount),
              },
            ]
          : [],

      gpay:
        customType === "gpay"
          ? [
              {
                date,
                amount: Number(receivedAmount),
              },
            ]
          : [],

      received_amount: Number(receivedAmount),
      balance_amount: 0,
      total_amount: 0,

      current_status: "party",
      approved: true,
    };

    if (!editId) {
      await createLocalList(payload);
      toast.success("Party Amount added successfully");
    } else {
      await updateLocalList(editId, payload);
      toast.success("Party Amount updated successfully");
    }

    loadLocalPartyData();

    setEditId("");
    setDate(new Date());
    setSearchCustomer("");
    setParticulars("");
    setCustomType("gpay");
    setReceivedAmount(0);
  };

  const handleEdit = (item) => {
    setEditId(item.documentId);
    setDate(new Date(item.date));
    setSearchCustomer({
      label: item.customer?.name,
      value: item.customer?.documentId,
    });
    setParticulars(item.particulars?.[0]?.text || "");
    setCustomType(item.cash?.length ? "cash" : "gpay");
    setReceivedAmount(
      item.custom_type === "cash"
        ? item.cash?.[0]?.amount || 0
        : item.gpay?.[0]?.amount || 0,
    );
  };

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">Local Party List</h1>

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
              label={"Show Overview"}
              onChange={() => toggleOverview()}
            />
          )}
        </div>
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
            amount={localAmount?.local_party?.total_cash}
            icon={<CashIcon color="#292D32" width="34" height="34" />}
            titleColor="text-green-800"
          />
          <CardUI
            title="Total Gpay"
            amount={localAmount?.local_party?.total_gpay}
            icon={<GpayIcon color="#292D32" width="34" height="34" />}
            titleColor="text-green-800"
          />
          <CardUI
            title="Total Balance"
            amount={localAmount?.local_party?.total_balance}
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
              setPage(0);
            }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6">
        <div className="grid grid-cols-6 gap-4 ">
          <DateUiPicker
            value={date}
            label="Date"
            onChange={(d) => setDate(setCurrentTime(d))}
            className={"w-full"}
            minDate={role === "superadmin" ? undefined : new Date()}
          />
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
              setPage(0);
            }}
          />
          <InputField
            placeholder="Instruction"
            value={particulars}
            onChange={(e) => setParticulars(e.target.value)}
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
            value={receivedAmount}
            onChange={(e) => setReceivedAmount(e.target.value) || 0}
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

      {/* Table */}

      <div className="mt-8">
        <Table borderAxis="both" hoverRow>
          <thead>
            <tr>
              <th className="w-[10%]">Date</th>
              <th className="w-[10%]">Customer</th>
              <th className="w-[11%]">Phone</th>
              <th className="w-[30%]">Particulars</th>
              <th className="w-[7%]">Total</th>
              <th className="w-[14%]">Cash</th>
              <th className="w-[16%]">GPay</th>
              <th className="w-[7%]">Balance</th>
              <th className="w-[10%]">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-4">
                  Loading...
                </td>
              </tr>
            ) : localData.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-4 text-gray-500">
                  No records found
                </td>
              </tr>
            ) : (
              localData.map((item) => (
                <tr key={item.documentId}>
                  <td>{dayjs(item.date).format("DD/MM/YYYY")}</td>

                  <td>{item.customer?.name || "-"}</td>

                  <td>{item.customer?.phonenumber || "-"}</td>

                  <td>
                    {item.particulars?.map((p) => (
                      <div key={p.id}>{p.text}</div>
                    ))}
                  </td>

                  <td>
                    {item.balance_amount === 0 || item.balance_amount === null
                      ? "-"
                      : formattedAmount(item.total_amount)}
                  </td>

                  <td>
                    {item.custom_type === "cash"
                      ? formattedAmount(item.cash_received)
                      : item.cash?.length === 0
                        ? "-"
                        : item.cash.map((c) => (
                            <div key={c.id}>
                              {dayjs(c.date).format("DD/MM/YY")} -{" "}
                              {formattedAmount(c.amount)}
                            </div>
                          ))}
                  </td>

                  <td>
                    {item.custom_type === "gpay"
                      ? formattedAmount(item.gpay_received)
                      : item.gpay?.length === 0
                        ? "-"
                        : item.gpay.map((g) => (
                            <div key={g.id}>
                              {dayjs(g.date).format("DD/MM/YY")} -{" "}
                              {formattedAmount(g.amount)}
                            </div>
                          ))}
                  </td>
                  <td className={item.balance_amount > 0 ? "text-red-500" : ""}>
                    {item.balance_amount === 0 || item.balance_amount === null
                      ? "-"
                      : formattedAmount(item.balance_amount)}
                  </td>

                  <td>
                    <div className="flex gap-2">
                      <EditButton
                        onClick={() => {
                          if (
                            item.total_amount === 0 ||
                            item.total_amount === null
                          ) {
                            handleEdit(item);
                          } else {
                            navigate(
                              `${LOCALENTRY}?editId=${item.documentId}&screenFrom=party`,
                            );
                          }
                        }}
                      />

                      <DeletePopup
                        handleDelete={() => handleDelete(item.documentId)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* Pagination Footer */}

          <tfoot>
            <tr>
              <td colSpan={9}>
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

      <LocalSalesExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        sectionTitle="Local Sales – Party List"
        status="party"
        customerOptions={customerOptions}
      />
    </MainLayout>
  );
};

export default LocalPartyList;
