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
  PendingIcon,
} from "../../components/icons";
import LeftArrowIcon from "../../components/icons/LeftArrowIcon";
import RightIcon from "../../components/icons/RightIcon";
import SelectField from "../../components/SelectField/SelectField";
import MainLayout from "../../layouts/MainLayout";

import { useAuth } from "../../context/auth-context";
import { useFinancialYear } from "../../context/financial-year-context";
import { LOCALENTRY } from "../../router/paths";
import dayjs from "../../utils/dayjs";
import { resolveApiDateRange } from "../../utils/financialYear";
import { formattedAmount } from "../../utils/FormatAmount";

import { getLocalAmounts } from "../../api/localAmount";
import {
  deleteLocalList,
  getLocalList,
  updateLocalList,
} from "../../api/localList";

function labelDisplayedRows({ from, to, count }) {
  return `${from}–${to} of ${count}`;
}

const LocalPendingList = () => {
  const { role, showOverview, toggleOverview } = useAuth();
  const { fromDate: fyFromDate, toDate: fyToDate } = useFinancialYear();
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [searchCustomer, setSearchCustomer] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [localData, setLocalData] = useState(null);
  const [localAmount, setLocalAmount] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  /* Confirmation popup state */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("pending");

  /*
   * Load customers
   */
  const loadCustomers = useCallback(async () => {
    try {
      const res = await getCustomers();
      setCustomers(res || []);
    } catch (error) {
      console.error("Customer fetch failed:", error);
      setCustomers([]);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  /*
   * Query builder
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

    const query = [];

    query.push("populate=*");
    query.push(`pagination[page]=${page + 1}`);
    query.push(`pagination[pageSize]=${rowsPerPage}`);
    query.push("sort[0]=date:desc");
    query.push("filters[current_status][$eq]=pending");
    query.push("filters[approved][$eq]=true");

    if (searchCustomer?.value) {
      query.push(
        `filters[customer][documentId][$eq]=${encodeURIComponent(
          searchCustomer.value,
        )}`,
      );
    }

    if (from && to) {
      const startDate = dayjs(from).startOf("day").toISOString();
      const endDate = dayjs(to).endOf("day").toISOString();

      /* GPay date filter */
      query.push(
        `filters[$or][0][gpay][date][$gte]=${encodeURIComponent(startDate)}`,
      );
      query.push(
        `filters[$or][0][gpay][date][$lte]=${encodeURIComponent(endDate)}`,
      );

      /* Cash date filter */
      query.push(
        `filters[$or][1][cash][date][$gte]=${encodeURIComponent(startDate)}`,
      );
      query.push(
        `filters[$or][1][cash][date][$lte]=${encodeURIComponent(endDate)}`,
      );
    }

    return `?${query.join("&")}`;
  }, [page, rowsPerPage, searchCustomer, fromDate, toDate, fyFromDate, fyToDate]);

  /*
   * Load pending data
   */
  const loadLocalPendingData = useCallback(async () => {
    try {
      const res = await getLocalList(buildQuery());

      setLocalData(res?.data || []);
      setTotalCount(res?.meta?.pagination?.total || 0);
    } catch (error) {
      console.error("Local pending fetch failed:", error);
      toast.error("Failed to load local pending list");

      setLocalData([]);
      setTotalCount(0);
    }
  }, [buildQuery]);

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        label: customer.name,
        value: customer.documentId,
      })),
    [customers],
  );

  /*
   * Load pending list whenever pagination/filter values change
   */
  useEffect(() => {
    let cancelled = false;

    const fetchPendingData = async () => {
      const queryString = buildQuery();
      if (queryString === null) return;

      try {
        const res = await getLocalList(queryString);

        if (!cancelled) {
          setLocalData(res?.data || []);
          setTotalCount(res?.meta?.pagination?.total || 0);
        }
      } catch (error) {
        console.error("Local pending fetch failed:", error);

        if (!cancelled) {
          toast.error("Failed to load local pending list");
          setLocalData([]);
          setTotalCount(0);
        }
      }
    };

    fetchPendingData();

    return () => {
      cancelled = true;
    };
  }, [buildQuery]);

  /*
   * Load totals whenever customer/date filters change
   */
  useEffect(() => {
    if (showOverview) {
      let cancelled = false;
      const fetchLocalTotalAmount = async () => {
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

          if (searchCustomer?.value) {
            query.push(
              `filters[customer][documentId][$eq]=${encodeURIComponent(
                searchCustomer.value,
              )}`,
            );
          }

          if (from && to) {
            query.push(`fromDate=${encodeURIComponent(from)}`);
            query.push(`toDate=${encodeURIComponent(to)}`);
          }

          const queryString = query.length ? `?${query.join("&")}` : "";

          const res = await getLocalAmounts(queryString);

          if (!cancelled) {
            setLocalAmount(res || null);
          }
        } catch (error) {
          console.error("Local amounts fetch failed:", error);

          if (!cancelled) {
            setLocalAmount(null);
          }
        }
      };

      fetchLocalTotalAmount();

      return () => {
        cancelled = true;
      };
    }
  }, [searchCustomer, fromDate, toDate, fyFromDate, fyToDate, showOverview]);

  /*
   * Delete
   */
  const handleDelete = async (id) => {
    try {
      await deleteLocalList(id);

      toast.success("Deleted successfully");

      await loadLocalPendingData();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete local entry");
    }
  };

  /*
   * Pagination
   */
  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (_, value) => {
    if (!value) return;

    setRowsPerPage(value);
    setPage(0);
  };

  const getLabelDisplayedRowsTo = () => {
    return Math.min((page + 1) * rowsPerPage, totalCount);
  };

  /*
   * Status change confirm
   */
  const handleStatusChange = async () => {
    if (!selectedItem || !selectedStatus) return;

    try {
      await updateLocalList(selectedItem.documentId, {
        current_status: selectedStatus,
      });

      toast.success("Status updated successfully");

      setConfirmOpen(false);
      setSelectedItem(null);
      setSelectedStatus("pending");

      await loadLocalPendingData();
    } catch (error) {
      console.error("Status update failed:", error);
      toast.error("Failed to update status");
    }
  };

  /*
   * Calculate balance
   */
  const getBalanceAmount = (item) => {
    const totalCash =
      item.cash?.reduce((sum, cashItem) => {
        return sum + Number(cashItem.amount || 0);
      }, 0) || 0;

    const totalGpay =
      item.gpay?.reduce((sum, gpayItem) => {
        return sum + Number(gpayItem.amount || 0);
      }, 0) || 0;

    return Number(item.total_amount || 0) - (totalCash + totalGpay);
  };

  const isLoading = localData === null;

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">Local pending List</h1>

        <Checkbox
          icon={<CheckBoxIcon />}
          checkedIcon={<CheckIcon color="#fff" />}
          checked={showOverview}
          style={{ marginRight: 8 }}
          label="Show Overview"
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
            amount={localAmount?.local_pending?.total_cash}
            icon={<CashIcon color="#292D32" width="34" height="34" />}
            titleColor="text-green-800"
          />

          <CardUI
            title="Total Gpay"
            amount={localAmount?.local_pending?.total_gpay}
            icon={<GpayIcon color="#292D32" width="34" height="34" />}
            titleColor="text-green-800"
          />

          <CardUI
            title="Total Balance"
            amount={localAmount?.local_pending?.total_balance}
            icon={<PendingIcon color="#292D32" width="34" height="34" />}
            titleColor="text-red-500"
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

      <div className="flex justify-end mt-6">
        <div className="w-80">
          <AutocompleteField
            label="Customer Name"
            value={searchCustomer}
            options={customerOptions}
            onChange={(_, value) => {
              setSearchCustomer(value);
              setPage(0);
            }}
          />
        </div>
      </div>

      <div className="mt-8">
        <Table borderAxis="both" hoverRow>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Particulars</th>
              <th>Total</th>
              <th>Balance</th>
              <th>Cash</th>
              <th>GPay</th>
              <th>Action</th>

              {role === "superadmin" && <th>Status</th>}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={role === "superadmin" ? 10 : 9}
                  className="text-center py-6"
                >
                  Loading...
                </td>
              </tr>
            ) : localData.length === 0 ? (
              <tr>
                <td
                  colSpan={role === "superadmin" ? 10 : 9}
                  className="text-center py-6"
                >
                  No pending records found
                </td>
              </tr>
            ) : (
              localData.map((item) => {
                const balance = getBalanceAmount(item);

                return (
                  <tr key={item.documentId}>
                    <td>{dayjs(item.date).format("DD/MM/YYYY")}</td>

                    <td>{item.customer?.name || "-"}</td>

                    <td>{item.customer?.phonenumber || "-"}</td>

                    <td>
                      {item.particulars?.length
                        ? item.particulars.map((particular) => (
                            <div key={particular.id}>{particular.text}</div>
                          ))
                        : "-"}
                    </td>

                    <td>{formattedAmount(item.total_amount)}</td>

                    <td className={balance > 0 ? "text-red-500" : ""}>
                      {formattedAmount(balance)}
                    </td>

                    <td>
                      {!item.cash?.length
                        ? "-"
                        : item.cash.map((cashItem) => (
                            <div key={cashItem.id}>
                              {dayjs(cashItem.date).format("DD/MM/YY")} -{" "}
                              {formattedAmount(cashItem.amount)}
                            </div>
                          ))}
                    </td>

                    <td>
                      {!item.gpay?.length
                        ? "-"
                        : item.gpay.map((gpayItem) => (
                            <div key={gpayItem.id}>
                              {dayjs(gpayItem.date).format("DD/MM/YY")} -{" "}
                              {formattedAmount(gpayItem.amount)}
                            </div>
                          ))}
                    </td>

                    <td>
                      <div className="flex gap-2">
                        <EditButton
                          onClick={() =>
                            navigate(
                              `${LOCALENTRY}?editId=${item.documentId}&screenFrom=pending`,
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
                          value={item.current_status || "pending"}
                          options={[
                            {
                              value: "pending",
                              label: "Pending",
                            },
                            {
                              value: "paid",
                              label: "Paid",
                            },
                            {
                              value: "party",
                              label: "Party",
                            },
                          ]}
                          onChange={(event) => {
                            const value = event.target.value;

                            if (!value || value === "pending") {
                              return;
                            }

                            setSelectedItem(item);
                            setSelectedStatus(value);
                            setConfirmOpen(true);
                          }}
                        />
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={role === "superadmin" ? 10 : 9}>
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

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-3">
              Confirm Status Change
            </h3>

            <p>
              Are you sure you want to change status to{" "}
              <span className="font-semibold capitalize">{selectedStatus}</span>
              ?
            </p>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleStatusChange}
                className="w-full border border-green-600 text-green-600 hover:bg-green-600 hover:text-white py-2 rounded"
              >
                Confirm
              </button>

              <button
                onClick={() => {
                  setConfirmOpen(false);
                  setSelectedItem(null);
                  setSelectedStatus("pending");
                }}
                className="w-full border py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default LocalPendingList;
