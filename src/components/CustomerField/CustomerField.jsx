import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { updateCustomer } from "../../api/customer";
import { updateGstCustomer } from "../../api/gstCustomer";
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

      setSelectedCustomerID(customer.documentId || "");
      setCustomerName(customer.name || "");

      if (isGstCustomer) {
        setAddress(customer.address || "");
        setDeliveryAddress(customer.delivery_address || "");
        setGstNo(customer.gst_no || "");
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
    (inputValue) => {
      setCustomerName(inputValue || "");
      if (SelectCustomerID) {
        const currentCustomer = (customerData || []).find(
          (c) => c.documentId === SelectCustomerID,
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
    }
  }, [customerName, customerData, applyCustomer, setSelectedCustomerID]);

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
    const trimmed = (gstNo || "").trim();
    if (!trimmed) return;
    const matched = (customerData || []).find(
      (c) => normalizeName(c.gst_no) === normalizeName(trimmed),
    );
    if (matched) {
      applyCustomer(matched);
    }
  }, [isGstCustomer, SelectCustomerID, gstNo, customerData, applyCustomer]);

  const handleAddressBlur = useCallback(() => {
    if (!isGstCustomer || SelectCustomerID) return;
    const trimmed = (address || "").trim();
    if (!trimmed) return;
    const matched = (customerData || []).find(
      (c) => normalizeName(c.address) === normalizeName(trimmed),
    );
    if (matched) {
      applyCustomer(matched);
    }
  }, [isGstCustomer, SelectCustomerID, address, customerData, applyCustomer]);

  const handleDeliveryAddressBlur = useCallback(() => {
    if (!isGstCustomer || SelectCustomerID) return;
    const trimmed = (deliveryAddress || "").trim();
    if (!trimmed) return;
    const matched = (customerData || []).find(
      (c) => normalizeName(c.delivery_address) === normalizeName(trimmed),
    );
    if (matched) {
      applyCustomer(matched);
    }
  }, [
    isGstCustomer,
    SelectCustomerID,
    deliveryAddress,
    customerData,
    applyCustomer,
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
          return normalizeName(customer.phonenumber) === normalizeName(rawValue);
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
          setCustomerName(rawValue);
          setSelectedCustomerID("");
        } else if (field === "phone" && !isGstCustomer) {
          setPhoneno(rawValue);
        } else if (field === "gst" && isGstCustomer) {
          setGstNo((rawValue || "").toUpperCase());
        } else if (field === "address" && isGstCustomer) {
          setAddress(rawValue);
        } else if (field === "delivery_address" && isGstCustomer) {
          setDeliveryAddress(rawValue);
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
    if (!SelectCustomerID) {
      setOpen(false);
      return;
    }

    try {
      const updated = isGstCustomer
        ? await updateGstCustomer(SelectCustomerID, {
            name: customerName,
            address,
            delivery_address: deliveryAddress,
            gst_no: gstNo,
          })
        : await updateCustomer(SelectCustomerID, {
            name: customerName,
            phonenumber: phoneno,
          });

      applyCustomer(updated);
      setOpen(false);
      toast.success("Customer updated successfully");
      fetchCustomers(); // refresh list
    } catch (error) {
      console.error("Failed to update customer:", error);
      toast.error("Failed to update customer");
    }
  };

  const nameOptions = useMemo(
    () => [...new Set((customerData || []).map((c) => c.name).filter(Boolean))],
    [customerData],
  );

  const phoneOptions = useMemo(
    () => [
      ...new Set((customerData || []).map((c) => c.phonenumber).filter(Boolean)),
    ],
    [customerData],
  );

  const addressOptions = useMemo(
    () => [
      ...new Set((customerData || []).map((c) => c.address).filter(Boolean)),
    ],
    [customerData],
  );

  const deliveryAddressOptions = useMemo(
    () => [
      ...new Set(
        (customerData || []).map((c) => c.delivery_address).filter(Boolean),
      ),
    ],
    [customerData],
  );

  const gstOptions = useMemo(
    () => [...new Set((customerData || []).map((c) => c.gst_no).filter(Boolean))],
    [customerData],
  );

  return (
    <div
      className={`grid ${isGstCustomer ? "grid-cols-3" : "grid-cols-2"} gap-4 mt-4 mb-8`}
    >
      <AutocompleteField
        label="Customer Name"
        value={customerName}
        onInputChange={(e, v) => handleNameInputChange(v)}
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
                <EditButton onClick={() => setOpen(true)} />
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
              <EditButton onClick={() => setOpen(true)} />
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
                <ClearIcon onClick={() => setOpen(false)} />
              </div>

              <InputField
                name="customerName"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />

              {isGstCustomer ? (
                <>
                  <InputField
                    name="address"
                    placeholder="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                  <InputField
                    name="gst_no"
                    placeholder="GST No"
                    value={gstNo}
                    onChange={(e) =>
                      setGstNo((e.target.value || "").toUpperCase())
                    }
                  />
                  <InputField
                    name="delivery_address"
                    placeholder="Delivery Address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                </>
              ) : (
                <InputField
                  name="phoneno"
                  placeholder="Phone Number"
                  value={phoneno}
                  onChange={(e) => setPhoneno(e.target.value)}
                />
              )}

              <Button
                label="Update"
                className="bg-[#9E77D2] w-full text-white mt-3"
                onClick={handleUpdate}
              />
            </div>
          </div>

          <div
            className="absolute inset-0 bg-black/50 z-[998]"
            onClick={() => setOpen(false)}
          />
        </>
      )}
    </div>
  );
};

export default CustomerField;
