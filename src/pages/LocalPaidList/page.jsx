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
import Datepicker from "../../components/Datepicker/Datepicker";
import DeletePopup from "../../components/DeletePopup/DeletePopup";
import EditButton from "../../components/EditButton/EditButton";
import {
  CashIcon,
  CheckBoxIcon,
  CheckIcon,
  GpayIcon,
} from "../../components/icons";

import MainLayout from "../../layouts/MainLayout";

import { LOCALENTRY } from "../../router/paths";
import dayjs from "../../utils/dayjs";
import { formattedAmount } from "../../utils/FormatAmount";

import { getLocalAmounts } from "../../api/localAmount";
import { deleteLocalList, getLocalList } from "../../api/localList";
import LeftArrowIcon from "../../components/icons/LeftArrowIcon";
import RightIcon from "../../components/icons/RightIcon";
import { useAuth } from "../../context/auth-context";

function labelDisplayedRows({ from, to, count }) {
  return `${from}–${to} of ${count}`;
}

const LocalPaidList = () => {
  const { showOverview, toggleOverview } = useAuth();
  const navigate = useNavigate();

  /* ================= STATE ================= */

  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [searchCustomer, setSearchCustomer] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [localData, setLocalData] = useState([]);
  const [localAmount, setLocalAmount] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

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
    const query = [];
    query.push("populate=*");
    query.push(`pagination[page]=${page + 1}`);
    query.push(`pagination[pageSize]=${rowsPerPage}`);
    query.push(`sort[0]=date:desc`);
    query.push(`filters[current_status][$eq]=paid`);
    query.push(`filters[approved][$eq]=true`);

    if (searchCustomer?.value) {
      query.push(`filters[customer][documentId][$eq]=${searchCustomer.value}`);
    }

    if (fromDate && toDate) {
      const startDate = dayjs(fromDate).startOf("day").toISOString();
      const endDate = dayjs(toDate).endOf("day").toISOString();

      // GPay date filter
      query.push(`filters[$or][0][gpay][date][$gte]=${startDate}`);
      query.push(`filters[$or][0][gpay][date][$lte]=${endDate}`);

      // Cash date filter
      query.push(`filters[$or][1][cash][date][$gte]=${startDate}`);
      query.push(`filters[$or][1][cash][date][$lte]=${endDate}`);
    }

    return `?${query.join("&")}`;
  }, [page, rowsPerPage, searchCustomer, fromDate, toDate]);

  /* ================= LOAD DATA ================= */

  const loadLocalPaidData = useCallback(async () => {
    setLoading(true);

    try {
      const res = await getLocalList(buildQuery());

      setLocalData(res?.data || []);
      setTotalCount(res?.meta?.pagination?.total || 0);
    } catch (error) {
      console.error("Local paid fetch failed:", error);
      toast.error("Failed to load local paid list");
      setLocalData([]);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const loadLocalTotalAmount = useCallback(async () => {
    setLoading(true);

    try {
      let query = [];

      if (searchCustomer) {
        query.push(
          `filters[customer][documentId][$eq]=${searchCustomer.value}`,
        );
      }

      if (fromDate && toDate) {
        const from = dayjs(fromDate).format("YYYY-MM-DD");
        const to = dayjs(toDate).format("YYYY-MM-DD");

        query.push(`fromDate=${from}`);
        query.push(`toDate=${to}`);
      }

      const queryString = query.length ? `?${query.join("&")}` : "";

      const res = await getLocalAmounts(queryString);

      setLocalAmount(res);
    } catch (error) {
      console.error("Local amounts fetch failed:", error);
      setLocalAmount([]);
    } finally {
      setLoading(false);
    }
  }, [searchCustomer, fromDate, toDate]);

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    loadLocalPaidData();
  }, [loadLocalPaidData]);

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
      loadLocalPaidData();
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
  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        label: c.name,
        value: c.documentId,
      })),
    [customers],
  );

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">Local Paid List</h1>
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
            title="Total Cash"
            amount={localAmount?.local_paid?.total_cash}
            icon={<CashIcon color="#292D32" width="34" height="34" />}
            titleColor="text-green-800"
          />
          <CardUI
            title="Total Gpay"
            amount={localAmount?.local_paid?.total_gpay}
            icon={<GpayIcon color="#292D32" width="34" height="34" />}
            titleColor="text-green-800"
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
              setSearchCustomer(val);
              setPage(0);
            }}
          />
        </div>
      </div>

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
              <th className="w-[10%]">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-4">
                  Loading...
                </td>
              </tr>
            ) : localData.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-gray-500">
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

                  <td>{formattedAmount(item.total_amount)}</td>

                  <td>
                    {item.cash?.length === 0
                      ? "-"
                      : item.cash.map((c) => (
                          <div key={c.id}>
                            {dayjs(c.date).format("DD/MM/YY")} -{" "}
                            {formattedAmount(c.amount)}
                          </div>
                        ))}
                  </td>

                  <td>
                    {item.gpay?.length === 0
                      ? "-"
                      : item.gpay.map((g) => (
                          <div key={g.id}>
                            {dayjs(g.date).format("DD/MM/YY")} -{" "}
                            {formattedAmount(g.amount)}
                          </div>
                        ))}
                  </td>

                  <td>
                    <div className="flex gap-2">
                      <EditButton
                        onClick={() =>
                          navigate(
                            `${LOCALENTRY}?editId=${item.documentId}&screenFrom=paid`,
                          )
                        }
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

export default LocalPaidList;
