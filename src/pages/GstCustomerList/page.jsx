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
  createGstCustomer,
  deleteGstCustomer,
  getGstCustomers,
  updateGstCustomer,
} from "../../api/gstCustomer";
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

const GstCustomerList = () => {
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
    gst_no: "",
    address: "",
    delivery_address: "",
  });
  const [addSaving, setAddSaving] = useState(false);

  // Load GST Customers
  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGstCustomers();
      setCustomers(data || []);
    } catch (error) {
      console.error("GST customer fetch failed:", error);
      toast.error("Failed to load GST customers");
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
      const gstNo = (item.gst_no || "").toLowerCase();
      const address = (item.address || "").toLowerCase();
      const deliveryAddress = (item.delivery_address || "").toLowerCase();
      return (
        name.includes(lower) ||
        gstNo.includes(lower) ||
        address.includes(lower) ||
        deliveryAddress.includes(lower)
      );
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
      gst_no: (customer.gst_no || "").toUpperCase(),
      address: customer.address || "",
      delivery_address: customer.delivery_address || "",
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

    const formattedGstNo = editCustomer.gst_no.trim().toUpperCase();
    const formattedAddress = capitalizeFirstLetter(editCustomer.address.trim());
    const formattedDeliveryAddress = capitalizeFirstLetter(
      editCustomer.delivery_address.trim(),
    );

    setEditSaving(true);
    try {
      const payload = {
        name: formattedName,
        gst_no: formattedGstNo,
        address: formattedAddress,
        delivery_address: formattedDeliveryAddress,
      };

      await updateGstCustomer(editCustomer.targetId, payload);

      setCustomers((prev) =>
        prev.map((c) =>
          (c.documentId || c.id) === editCustomer.targetId
            ? { ...c, ...payload }
            : c,
        ),
      );

      toast.success("GST customer updated successfully");
      setIsEditOpen(false);
      setEditCustomer(null);
    } catch (error) {
      console.error("Failed to update GST customer:", error);
      toast.error(
        error?.response?.data?.error?.message ||
          "Failed to update GST customer",
      );
    } finally {
      setEditSaving(false);
    }
  };

  // Delete GST Customer
  const handleDeleteCustomer = async (targetId) => {
    try {
      await deleteGstCustomer(targetId);
      setCustomers((prev) =>
        prev.filter((c) => (c.documentId || c.id) !== targetId),
      );
      toast.success("GST customer deleted successfully");
    } catch (error) {
      console.error("Failed to delete GST customer:", error);
      toast.error(
        error?.response?.data?.error?.message ||
          "Failed to delete GST customer",
      );
    }
  };

  // Create GST Customer
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    const formattedName = capitalizeFirstLetter(newCustomer.name.trim());
    if (!formattedName) {
      toast.error("Customer name is required");
      return;
    }

    const formattedGstNo = newCustomer.gst_no.trim().toUpperCase();
    const formattedAddress = capitalizeFirstLetter(newCustomer.address.trim());
    const formattedDeliveryAddress = capitalizeFirstLetter(
      newCustomer.delivery_address.trim(),
    );

    setAddSaving(true);
    try {
      const payload = {
        name: formattedName,
        gst_no: formattedGstNo,
        address: formattedAddress,
        delivery_address: formattedDeliveryAddress,
      };

      const res = await createGstCustomer(payload);

      if (res) {
        toast.success("GST customer created successfully");
        setIsAddOpen(false);
        setNewCustomer({
          name: "",
          gst_no: "",
          address: "",
          delivery_address: "",
        });
        await loadCustomers();
      }
    } catch (error) {
      console.error("Failed to create GST customer:", error);
      toast.error(
        error?.response?.data?.error?.message ||
          "Failed to create GST customer",
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
            <h1 className="text-2xl font-bold text-gray-800">GST Customers</h1>
            <span className="bg-[#EDE9FE] text-[#6D28D9] text-xs font-semibold px-2.5 py-1 rounded-full">
              {filteredCustomers.length} Total
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Manage your GST-registered client profiles, addresses, and GSTIN
            numbers.
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
            label="Add GST Customer"
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
            placeholder="Search by name, GSTIN, or address..."
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
                <th style={{ width: "5%" }}>#</th>
                <th style={{ width: "22%" }}>Customer Name</th>
                <th style={{ width: "16%" }}>GSTIN</th>
                <th style={{ width: "22%" }}>Billing Address</th>
                <th style={{ width: "17%" }}>Delivery Address</th>
                <th style={{ width: "10%" }}>Created Date</th>
                <th style={{ width: "8%" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    Loading GST customers...
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No GST customers found.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer, index) => {
                  const targetId = customer.documentId || customer.id;
                  const rowNumber =
                    rowsPerPage === -1
                      ? index + 1
                      : page * rowsPerPage + index + 1;
                  const gst = customer.gst_no;

                  return (
                    <tr key={targetId}>
                      <td className="text-gray-500 font-medium">{rowNumber}</td>
                      <td className="font-semibold text-gray-800">
                        {customer.name || "-"}
                      </td>
                      <td>
                        {gst ? (
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                            {gst.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">No GSTIN</span>
                        )}
                      </td>
                      <td className="text-gray-600 text-sm">
                        {customer.address || (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>
                      <td className="text-gray-600 text-sm">
                        {customer.delivery_address || (
                          <span className="text-gray-400 italic">-</span>
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
                <td colSpan={7}>
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

      {/* ── Edit GST Customer Modal ── */}
      {isEditOpen && editCustomer && (
        <div
          className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center p-4"
          onClick={() => !editSaving && setIsEditOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5 pb-3 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                Edit GST Customer
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
                placeholder="GSTIN Number"
                name="gst_no"
                value={editCustomer.gst_no}
                onChange={(e) =>
                  setEditCustomer((prev) => ({
                    ...prev,
                    gst_no: e.target.value.toUpperCase(),
                  }))
                }
              />

              <div className="flex flex-col w-full">
                <label className="text-base font-semibold mb-1">
                  Billing Address
                </label>
                <textarea
                  name="address"
                  rows={2}
                  placeholder="Enter billing address"
                  value={editCustomer.address}
                  onChange={(e) =>
                    setEditCustomer((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-400 rounded-md p-2 focus:outline-none focus:border-[#4F46E5] text-sm"
                />
              </div>

              <div className="flex flex-col w-full">
                <label className="text-base font-semibold mb-1">
                  Delivery Address
                </label>
                <textarea
                  name="delivery_address"
                  rows={2}
                  placeholder="Enter delivery address (if different)"
                  value={editCustomer.delivery_address}
                  onChange={(e) =>
                    setEditCustomer((prev) => ({
                      ...prev,
                      delivery_address: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-400 rounded-md p-2 focus:outline-none focus:border-[#4F46E5] text-sm"
                />
              </div>

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

      {/* ── Add GST Customer Modal ── */}
      {isAddOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center p-4"
          onClick={() => !addSaving && setIsAddOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5 pb-3 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                Add New GST Customer
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
                placeholder="GSTIN Number"
                name="gst_no"
                value={newCustomer.gst_no}
                onChange={(e) =>
                  setNewCustomer((prev) => ({
                    ...prev,
                    gst_no: e.target.value.toUpperCase(),
                  }))
                }
              />

              <div className="flex flex-col w-full">
                <label className="text-base font-semibold mb-1">
                  Billing Address
                </label>
                <textarea
                  name="address"
                  rows={2}
                  placeholder="Enter billing address"
                  value={newCustomer.address}
                  onChange={(e) =>
                    setNewCustomer((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-400 rounded-md p-2 focus:outline-none focus:border-[#4F46E5] text-sm"
                />
              </div>

              <div className="flex flex-col w-full">
                <label className="text-base font-semibold mb-1">
                  Delivery Address
                </label>
                <textarea
                  name="delivery_address"
                  rows={2}
                  placeholder="Enter delivery address (if different)"
                  value={newCustomer.delivery_address}
                  onChange={(e) =>
                    setNewCustomer((prev) => ({
                      ...prev,
                      delivery_address: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-400 rounded-md p-2 focus:outline-none focus:border-[#4F46E5] text-sm"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t justify-end">
                <Button
                  label="Cancel"
                  onClick={() => setIsAddOpen(false)}
                  disabled={addSaving}
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                />
                <Button
                  type="submit"
                  label={addSaving ? "Creating..." : "Create GST Customer"}
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
        title="GST Customers Directory"
        filePrefix="GST_Customers"
        isGst={true}
        allCustomers={customers}
        filteredCustomers={filteredCustomers}
        searchText={searchText}
      />
    </MainLayout>
  );
};

export default GstCustomerList;
