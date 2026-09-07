import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { updateCustomer } from "../../api/customer";
import { updateGstCustomer } from "../../api/gstCustomer";
import { capitalizeFirstLetter } from "../../utils/Captialize";
import {
  findMatchingEntity,
  isNameMatch,
  normalizeName,
} from "../../utils/nameNormalizer";
import AutocompleteField from "../AutocompleteField/AutocompleteField";
import Button from "../Button/Button";
import EditButton from "../EditButton/EditButton";
import { ClearIcon } from "../icons";
import InputField from "../InputField/InputField";

const CustomerField = ({
  customerData = [],
  fetchCustomers,
  setCustomerData,
  customerName,
  setCustomerName,
  phoneno,
  setPhoneno,
  address,
  setAddress,
  deliveryAddress,
  setDeliveryAddress,
  gstNo,
  setGstNo,
  SelectCustomerID,
  setSelectedCustomerID,
  isGstCustomer = false,
}) => {
  const [open, setOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
    deliveryAddress: "",
    gstNo: "",
    phoneno: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleOpenModal = () => {
    setEditingCustomerId(SelectCustomerID);
    setEditForm({
      name: capitalizeFirstLetter(customerName || ""),
      address: capitalizeFirstLetter(address || ""),
      deliveryAddress: capitalizeFirstLetter(deliveryAddress || ""),
      gstNo: (gstNo || "").toUpperCase(),
      phoneno: phoneno || "",
    });
    setOpen(true);
  };

  const handleCloseModal = () => {
    if (isUpdating) return;
    setOpen(false);
    setEditingCustomerId(null);
  };

  const resetFields = useCallback(() => {
    setCustomerName("");
    setSelectedCustomerID("");
    if (isGstCustomer) {
      setAddress("");
      setDeliveryAddress("");
      setGstNo("");
    } else {
      setPhoneno("");
    }
  }, [
    isGstCustomer,
    setCustomerName,
    setSelectedCustomerID,
    setAddress,
    setDeliveryAddress,
    setGstNo,
    setPhoneno,
  ]);

  const applyCustomer = useCallback(
    (customer) => {
      if (!customer) {
        setSelectedCustomerID("");
        return;
      }

      setSelectedCustomerID(customer.documentId || customer.id || "");
      setCustomerName(capitalizeFirstLetter(customer.name || ""));

      if (isGstCustomer) {
        setAddress(capitalizeFirstLetter(customer.address || ""));
        setDeliveryAddress(
          capitalizeFirstLetter(customer.delivery_address || ""),
        );
        setGstNo((customer.gst_no || "").toUpperCase());
      } else {
        setPhoneno(customer.phonenumber || "");
      }
    },
    [
      isGstCustomer,
      setSelectedCustomerID,
      setCustomerName,
      setAddress,
      setDeliveryAddress,
      setGstNo,
      setPhoneno,
    ],
  );

  const handleNameInputChange = useCallback(
    (inputValue, reason) => {
      setCustomerName(inputValue || "");
      if (reason === "input" && SelectCustomerID) {
        const currentCustomer = (customerData || []).find(
          (c) => (c.documentId || c.id) === SelectCustomerID,
        );
        if (
          currentCustomer &&
          !isNameMatch(currentCustomer.name, inputValue || "")
        ) {
          setSelectedCustomerID("");
        }
      }
    },
    [SelectCustomerID, customerData, setCustomerName, setSelectedCustomerID],
  );

  const handleNameBlur = useCallback(() => {
    const trimmed = (customerName || "").trim();
    if (!trimmed) {
      setSelectedCustomerID("");
      return;
    }

    const matched = findMatchingEntity(trimmed, customerData, "name");
    if (matched) {
      applyCustomer(matched);
    } else {
      setSelectedCustomerID("");
      setCustomerName(capitalizeFirstLetter(trimmed));
    }
  }, [
    customerName,
    customerData,
    applyCustomer,
    setSelectedCustomerID,
    setCustomerName,
  ]);

  const handlePhoneBlur = useCallback(() => {
    if (isGstCustomer || SelectCustomerID) return;
    const trimmed = (phoneno || "").trim();
    if (!trimmed) return;
    const matched = (customerData || []).find(
      (c) => normalizeName(c.phonenumber) === normalizeName(trimmed),
    );
    if (matched) {
      applyCustomer(matched);
    }
  }, [isGstCustomer, SelectCustomerID, phoneno, customerData, applyCustomer]);

  const handleGstBlur = useCallback(() => {
    if (!isGstCustomer || SelectCustomerID) return;
    const trimmed = (gstNo || "").trim().toUpperCase();
    if (!trimmed) return;
    setGstNo(trimmed);
    const matched = (customerData || []).find(
      (c) => normalizeName(c.gst_no) === normalizeName(trimmed),
    );
    if (matched) {
      applyCustomer(matched);
    }
  }, [
    isGstCustomer,
    SelectCustomerID,
    gstNo,
    customerData,
    applyCustomer,
    setGstNo,
  ]);

  const handleAddressBlur = useCallback(() => {
    if (!isGstCustomer || SelectCustomerID) return;
    const trimmed = (address || "").trim();
    if (!trimmed) return;
    const matched = (customerData || []).find(
      (c) => normalizeName(c.address) === normalizeName(trimmed),
    );
    if (matched) {
      applyCustomer(matched);
    } else {
      setAddress(capitalizeFirstLetter(trimmed));
    }
  }, [
    isGstCustomer,
    SelectCustomerID,
    address,
    customerData,
    applyCustomer,
    setAddress,
  ]);

  const handleDeliveryAddressBlur = useCallback(() => {
    if (!isGstCustomer || SelectCustomerID) return;
    const trimmed = (deliveryAddress || "").trim();
    if (!trimmed) return;
    const matched = (customerData || []).find(
      (c) => normalizeName(c.delivery_address) === normalizeName(trimmed),
    );
    if (matched) {
      applyCustomer(matched);
    } else {
      setDeliveryAddress(capitalizeFirstLetter(trimmed));
    }
  }, [
    isGstCustomer,
    SelectCustomerID,
    deliveryAddress,
    customerData,
    applyCustomer,
    setDeliveryAddress,
  ]);

  const handleCustomerChange = useCallback(
    (value, field) => {
      if (!value) {
        if (field === "name") {
          resetFields();
        }
        return;
      }

      const rawValue =
        typeof value === "object" ? value?.name || value?.label || "" : value;

      const selected = (customerData || []).find((customer) => {
        if (!customer) return false;
        if (field === "name") {
          return isNameMatch(customer.name, rawValue);
        }

        if (field === "phone" && !isGstCustomer) {
          return (
            normalizeName(customer.phonenumber) === normalizeName(rawValue)
          );
        }

        if (field === "gst" && isGstCustomer) {
          return normalizeName(customer.gst_no) === normalizeName(rawValue);
        }

        if (field === "address" && isGstCustomer) {
          return normalizeName(customer.address) === normalizeName(rawValue);
        }

        if (field === "delivery_address" && isGstCustomer) {
          return (
            normalizeName(customer.delivery_address) === normalizeName(rawValue)
          );
        }

        return false;
      });

      if (selected) {
        applyCustomer(selected);
      } else {
        if (field === "name") {
          setCustomerName(capitalizeFirstLetter(rawValue));
          setSelectedCustomerID("");
        } else if (field === "phone" && !isGstCustomer) {
          setPhoneno(rawValue);
        } else if (field === "gst" && isGstCustomer) {
          setGstNo((rawValue || "").toUpperCase());
        } else if (field === "address" && isGstCustomer) {
          setAddress(capitalizeFirstLetter(rawValue));
        } else if (field === "delivery_address" && isGstCustomer) {
          setDeliveryAddress(capitalizeFirstLetter(rawValue));
        }
      }
    },
    [
      customerData,
      isGstCustomer,
      applyCustomer,
      resetFields,
      setCustomerName,
      setSelectedCustomerID,
      setPhoneno,
      setGstNo,
      setAddress,
      setDeliveryAddress,
    ],
  );

  const handleUpdate = async () => {
    const targetId = editingCustomerId || SelectCustomerID;
    if (!targetId) {
      setOpen(false);
      return;
    }

    const formattedName = capitalizeFirstLetter((editForm.name || "").trim());
    const formattedAddress = capitalizeFirstLetter(
      (editForm.address || "").trim(),
    );
    const formattedDeliveryAddress = capitalizeFirstLetter(
      (editForm.deliveryAddress || "").trim(),
    );
    const formattedGstNo = (editForm.gstNo || "").trim().toUpperCase();
    const formattedPhone = (editForm.phoneno || "").trim();

    if (!formattedName) {
      toast.error("Customer name is required");
      return;
    }

    setIsUpdating(true);
    try {
      const payload = isGstCustomer
        ? {
            name: formattedName,
            address: formattedAddress,
            delivery_address: formattedDeliveryAddress,
            gst_no: formattedGstNo,
          }
        : {
            name: formattedName,
            phonenumber: formattedPhone,
          };

      const updated = isGstCustomer
        ? await updateGstCustomer(targetId, payload)
        : await updateCustomer(targetId, payload);

      if (updated && (updated.documentId || updated.id || updated.name)) {
        applyCustomer(updated);
      } else {
        setSelectedCustomerID(targetId);
        setCustomerName(formattedName);
        if (isGstCustomer) {
          setAddress(formattedAddress);
          setDeliveryAddress(formattedDeliveryAddress);
          setGstNo(formattedGstNo);
        } else {
          setPhoneno(formattedPhone);
        }
      }

      if (typeof setCustomerData === "function") {
        setCustomerData((prev) =>
          (prev || []).map((c) =>
            c.documentId === targetId || c.id === targetId
              ? { ...c, ...payload }
              : c,
          ),
        );
      }

      setOpen(false);
      setEditingCustomerId(null);
      toast.success("Customer updated successfully");
      if (typeof fetchCustomers === "function") {
        await fetchCustomers();
      }
    } catch (error) {
      console.error("Failed to update customer:", error);
      toast.error("Failed to update customer");
    } finally {
      setIsUpdating(false);
    }
  };

  const nameOptions = useMemo(
    () => [
      ...new Set(
        (customerData || [])
          .map((c) => capitalizeFirstLetter(c.name))
          .filter(Boolean),
      ),
    ],
    [customerData],
  );

  const phoneOptions = useMemo(
    () => [
      ...new Set(
        (customerData || []).map((c) => c.phonenumber).filter(Boolean),
      ),
    ],
    [customerData],
  );

  const addressOptions = useMemo(
    () => [
      ...new Set(
        (customerData || [])
          .map((c) => capitalizeFirstLetter(c.address))
          .filter(Boolean),
      ),
    ],
    [customerData],
  );

  const deliveryAddressOptions = useMemo(
    () => [
      ...new Set(
        (customerData || [])
          .map((c) => capitalizeFirstLetter(c.delivery_address))
          .filter(Boolean),
      ),
    ],
    [customerData],
  );

  const gstOptions = useMemo(
    () => [
      ...new Set((customerData || []).map((c) => c.gst_no).filter(Boolean)),
    ],
    [customerData],
  );

  return (
    <div
      className={`grid ${isGstCustomer ? "grid-cols-3" : "grid-cols-2"} gap-4 mt-4 mb-8`}
    >
      <AutocompleteField
        label="Customer Name"
        value={customerName}
        onInputChange={(e, v, reason) => handleNameInputChange(v, reason)}
        onChange={(e, v) => handleCustomerChange(v, "name")}
        onBlur={handleNameBlur}
        options={nameOptions}
        required
      />

      {isGstCustomer ? (
        <>
          <AutocompleteField
            label="Address"
            value={address}
            onInputChange={(e, v) => setAddress(v)}
            onChange={(e, v) => handleCustomerChange(v, "address")}
            onBlur={handleAddressBlur}
            options={addressOptions}
            disabled={!!SelectCustomerID}
          />
          <AutocompleteField
            label="GST No"
            value={gstNo}
            onInputChange={(e, v) => setGstNo((v || "").toUpperCase())}
            onChange={(e, v) => handleCustomerChange(v, "gst")}
            onBlur={handleGstBlur}
            options={gstOptions}
            disabled={!!SelectCustomerID}
          />

          <div className="flex gap-2 items-end">
            <AutocompleteField
              label="Delivery Address"
              value={deliveryAddress}
              onInputChange={(e, v) => setDeliveryAddress(v)}
              onChange={(e, v) => handleCustomerChange(v, "delivery_address")}
              onBlur={handleDeliveryAddressBlur}
              options={deliveryAddressOptions}
              disabled={!!SelectCustomerID}
            />

            {SelectCustomerID && (
              <div className="h-9">
                <EditButton onClick={handleOpenModal} />
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex gap-2 items-end">
          <AutocompleteField
            label="Phone Number"
            value={phoneno}
            onInputChange={(e, v) => setPhoneno(v)}
            onChange={(e, v) => handleCustomerChange(v, "phone")}
            onBlur={handlePhoneBlur}
            options={phoneOptions}
            type="tel"
            disabled={!!SelectCustomerID}
          />
          {SelectCustomerID && (
            <div className="h-9">
              <EditButton onClick={handleOpenModal} />
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {open && (
        <>
          <div className="absolute inset-0 flex items-center justify-center z-[999]">
            <div className="relative w-full max-w-[24rem] rounded-lg shadow bg-white p-4">
              <div className="flex justify-end mb-2">
                <ClearIcon onClick={handleCloseModal} />
              </div>

              <InputField
                name="customerName"
                placeholder="Customer Name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
                onBlur={() =>
                  setEditForm((prev) => ({
                    ...prev,
                    name: capitalizeFirstLetter(prev.name || ""),
                  }))
                }
              />

              {isGstCustomer ? (
                <>
                  <InputField
                    name="address"
                    placeholder="Address"
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    onBlur={() =>
                      setEditForm((prev) => ({
                        ...prev,
                        address: capitalizeFirstLetter(prev.address || ""),
                      }))
                    }
                  />
                  <InputField
                    name="gst_no"
                    placeholder="GST No"
                    value={editForm.gstNo}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        gstNo: (e.target.value || "").toUpperCase(),
                      }))
                    }
                  />
                  <InputField
                    name="delivery_address"
                    placeholder="Delivery Address"
                    value={editForm.deliveryAddress}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        deliveryAddress: e.target.value,
                      }))
                    }
                    onBlur={() =>
                      setEditForm((prev) => ({
                        ...prev,
                        deliveryAddress: capitalizeFirstLetter(
                          prev.deliveryAddress || "",
                        ),
                      }))
                    }
                  />
                </>
              ) : (
                <InputField
                  name="phoneno"
                  placeholder="Phone Number"
                  value={editForm.phoneno}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      phoneno: e.target.value,
                    }))
                  }
                />
              )}

              <Button
                label={isUpdating ? "Updating..." : "Update"}
                disabled={isUpdating}
                className="bg-[#9E77D2] w-full text-white mt-3"
                onClick={handleUpdate}
              />
            </div>
          </div>

          <div
            className="absolute inset-0 bg-black/50 z-[998]"
            onClick={handleCloseModal}
          />
        </>
      )}
    </div>
  );
};

export default CustomerField;
