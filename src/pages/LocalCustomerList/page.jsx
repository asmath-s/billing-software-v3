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
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
} from "../../api/customer";
import Button from "../../components/Button/Button";
import CustomerExportModal from "../../components/CustomerExportModal/CustomerExportModal";
import DeletePopup from "../../components/DeletePopup/DeletePopup";
import EditButton from "../../components/EditButton/EditButton";
import {
  AddIcon,
  ClearIcon,
  LeftArrowIcon,
  RightIcon,
  SaveIcon,
  SavePdfIcon,
} from "../../components/icons";
import InputField from "../../components/InputField/InputField";
import { ROLES } from "../../config/appConfig";
import { useAuth } from "../../context/auth-context";
import MainLayout from "../../layouts/MainLayout";
import { capitalizeFirstLetter } from "../../utils/Captialize";

function labelDisplayedRows({ from, to, count }) {
  return `${from}–${to} of ${count}`;
}

const LocalCustomerList = () => {
  const { role } = useAuth();

  // Access Control: Accessible only to Admin and SuperAdmin
  const isAdmin =
    role === ROLES.Admin ||
    role === ROLES.SuperAdmin ||
    role === "admin" ||
    role === "superadmin";

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Export Modal State
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  // Add Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phonenumber: "",
  });
  const [addSaving, setAddSaving] = useState(false);

  // Load Customers
  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data || []);
    } catch (error) {
      console.error("Local customer fetch failed:", error);
      toast.error("Failed to load local customers");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadCustomers();
    }
  }, [loadCustomers, isAdmin]);

  // Filtered customers based on search text
  const filteredCustomers = useMemo(() => {
    if (!searchText.trim()) return customers;
    const lower = searchText.trim().toLowerCase();
    return customers.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const phone = (item.phonenumber || "").toLowerCase();
      return name.includes(lower) || phone.includes(lower);
    });
  }, [customers, searchText]);

  // Paginated records
  const paginatedCustomers = useMemo(() => {
    if (rowsPerPage === -1) return filteredCustomers;
    const startIndex = page * rowsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredCustomers, page, rowsPerPage]);

  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (_, value) => {
    setRowsPerPage(Number(value));
    setPage(0);
  };

  const getLabelDisplayedRowsTo = () => {
    if (rowsPerPage === -1) return filteredCustomers.length;
    return Math.min((page + 1) * rowsPerPage, filteredCustomers.length);
  };

  // Open Edit Modal
  const handleOpenEdit = (customer) => {
    setEditCustomer({
      targetId: customer.documentId || customer.id,
      name: customer.name || "",
      phonenumber: customer.phonenumber || "",
    });
    setIsEditOpen(true);
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editCustomer?.targetId) return;

    const formattedName = capitalizeFirstLetter(editCustomer.name.trim());
    if (!formattedName) {
      toast.error("Customer name is required");
      return;
    }

    setEditSaving(true);
    try {
      const payload = {
        name: formattedName,
        phonenumber: editCustomer.phonenumber.trim(),
      };

      await updateCustomer(editCustomer.targetId, payload);

      setCustomers((prev) =>
        prev.map((c) =>
          (c.documentId || c.id) === editCustomer.targetId
            ? { ...c, ...payload }
            : c,
        ),
      );

      toast.success("Customer updated successfully");
      setIsEditOpen(false);
      setEditCustomer(null);
    } catch (error) {
      console.error("Failed to update customer:", error);
      toast.error(
        error?.response?.data?.error?.message || "Failed to update customer",
      );
    } finally {
      setEditSaving(false);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (targetId) => {
    try {
      await deleteCustomer(targetId);
      setCustomers((prev) =>
        prev.filter((c) => (c.documentId || c.id) !== targetId),
      );
      toast.success("Customer deleted successfully");
    } catch (error) {
      console.error("Failed to delete customer:", error);
      toast.error(
        error?.response?.data?.error?.message || "Failed to delete customer",
      );
    }
  };

  // Create Customer
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    const formattedName = capitalizeFirstLetter(newCustomer.name.trim());
    if (!formattedName) {
      toast.error("Customer name is required");
      return;
    }

    setAddSaving(true);
    try {
      const payload = {
        name: formattedName,
        phonenumber: newCustomer.phonenumber.trim(),
      };

      const res = await createCustomer(payload);

      if (res) {
        toast.success("Customer created successfully");
        setIsAddOpen(false);
        setNewCustomer({ name: "", phonenumber: "" });
        await loadCustomers();
      }
    } catch (error) {
      console.error("Failed to create customer:", error);
      toast.error(
        error?.response?.data?.error?.message || "Failed to create customer",
      );
    } finally {
      setAddSaving(false);
    }
  };

  // Access Protection
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">
              Local Customers
            </h1>
            <span className="bg-[#EDE9FE] text-[#6D28D9] text-xs font-semibold px-2.5 py-1 rounded-full">
              {filteredCustomers.length} Total
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Manage your local customers directory, update details, or remove records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            label="Export"
            icon1={<SavePdfIcon color="#fff" />}
            icon2={<SavePdfIcon color="#9e77d2" />}
            className="bg-transparent border-[#9e77d2] text-[#9e77d2] hover:bg-[#9e77d2] hover:text-white font-medium px-4 py-2"
            onClick={() => setExportModalOpen(true)}
            disabled={customers.length === 0}
          />

          <Button
            label="Add Customer"
            icon1={<AddIcon color="#fff" />}
            icon2={<AddIcon color="#fff" />}
            className="bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium px-4 py-2"
            onClick={() => setIsAddOpen(true)}
          />
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-96">
          <InputField
            name="search"
            placeholder="Search by customer name or phone..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(0);
            }}
          />
        </div>
        {searchText && (
          <button
            type="button"
            onClick={() => {
              setSearchText("");
              setPage(0);
            }}
            className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 self-start md:self-center transition"
          >
            <ClearIcon width="14" height="14" /> Clear Filter
          </button>
        )}
      </div>

      {/* ── Customers Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table borderAxis="both" hoverRow>
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th style={{ width: "8%" }}>#</th>
                <th style={{ width: "35%" }}>Customer Name</th>
                <th style={{ width: "25%" }}>Phone Number</th>
                <th style={{ width: "17%" }}>Created Date</th>
                <th style={{ width: "15%" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    Loading local customers...
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    No customers found.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer, index) => {
                  const targetId = customer.documentId || customer.id;
                  const rowNumber =
                    rowsPerPage === -1
                      ? index + 1
                      : page * rowsPerPage + index + 1;

                  return (
                    <tr key={targetId}>
                      <td className="text-gray-500 font-medium">{rowNumber}</td>
                      <td className="font-semibold text-gray-800">
                        {customer.name || "-"}
                      </td>
                      <td className="text-gray-600">
                        {customer.phonenumber ? (
                          <span className="font-mono">
                            {customer.phonenumber}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">No phone</span>
                        )}
                      </td>
                      <td className="text-gray-600 text-sm">
                        {customer.createdAt
                          ? dayjs(customer.createdAt).format("DD-MM-YYYY")
                          : "-"}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <EditButton
                            onClick={() => handleOpenEdit(customer)}
                          />
                          <DeletePopup
                            message={`Are you sure you want to delete "${customer.name}"?`}
                            handleDelete={() => handleDeleteCustomer(targetId)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* ── Pagination ── */}
            <tfoot>
              <tr>
                <td colSpan={5}>
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
                          filteredCustomers.length === 0
                            ? 0
                            : page * rowsPerPage + 1,
                        to: getLabelDisplayedRowsTo(),
                        count: filteredCustomers.length,
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
                          getLabelDisplayedRowsTo() >= filteredCustomers.length
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

      {/* ── Edit Customer Modal ── */}
      {isEditOpen && editCustomer && (
        <div
          className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center p-4"
          onClick={() => !editSaving && setIsEditOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5 pb-3 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                Edit Local Customer
              </h2>
              <button
                type="button"
                onClick={() => !editSaving && setIsEditOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <ClearIcon />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <InputField
                placeholder="Customer Name"
                name="name"
                value={editCustomer.name}
                onChange={(e) =>
                  setEditCustomer((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                required
              />

              <InputField
                placeholder="Phone Number"
                name="phonenumber"
                value={editCustomer.phonenumber}
                onChange={(e) =>
                  setEditCustomer((prev) => ({
                    ...prev,
                    phonenumber: e.target.value,
                  }))
                }
              />

              <div className="flex gap-3 pt-4 border-t justify-end">
                <Button
                  label="Cancel"
                  onClick={() => setIsEditOpen(false)}
                  disabled={editSaving}
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                />
                <Button
                  type="submit"
                  label={editSaving ? "Saving..." : "Save Changes"}
                  icon1={<SaveIcon color="#fff" />}
                  icon2={<SaveIcon color="#fff" />}
                  disabled={editSaving}
                  className="bg-[#4F46E5] hover:bg-[#4338CA] text-white"
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Customer Modal ── */}
      {isAddOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center p-4"
          onClick={() => !addSaving && setIsAddOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5 pb-3 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                Add New Local Customer
              </h2>
              <button
                type="button"
                onClick={() => !addSaving && setIsAddOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <ClearIcon />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <InputField
                placeholder="Customer Name"
                name="name"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                required
              />

              <InputField
                placeholder="Phone Number"
                name="phonenumber"
                value={newCustomer.phonenumber}
                onChange={(e) =>
                  setNewCustomer((prev) => ({
                    ...prev,
                    phonenumber: e.target.value,
                  }))
                }
              />

              <div className="flex gap-3 pt-4 border-t justify-end">
                <Button
                  label="Cancel"
                  onClick={() => setIsAddOpen(false)}
                  disabled={addSaving}
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                />
                <Button
                  type="submit"
                  label={addSaving ? "Creating..." : "Create Customer"}
                  icon1={<SaveIcon color="#fff" />}
                  icon2={<SaveIcon color="#fff" />}
                  disabled={addSaving}
                  className="bg-[#4F46E5] hover:bg-[#4338CA] text-white"
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Export Modal ── */}
      <CustomerExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Local Customers Directory"
        filePrefix="Local_Customers"
        isGst={false}
        allCustomers={customers}
        filteredCustomers={filteredCustomers}
        searchText={searchText}
      />
    </MainLayout>
  );
};

export default LocalCustomerList;
