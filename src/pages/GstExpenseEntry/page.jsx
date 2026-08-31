import {
  createGstExpenseList,
  getGstExpenseListById,
  updateGstExpenseList,
} from "../../api/gstExpense";
import MainLayout from "../../layouts/MainLayout";

import { createVendor, getVendors } from "../../api/vendor";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import AutocompleteField from "../../components/AutocompleteField/AutocompleteField";
import Button from "../../components/Button/Button";
import { DateUiPicker } from "../../components/Datepicker/Datepicker";
import { AddIcon, SaveIcon } from "../../components/icons";
import InputField from "../../components/InputField/InputField";
import { capitalizeFirstLetter } from "../../utils/Captialize";
import { setCurrentTime } from "../../utils/DatewithTime";
import {
  findMatchingEntity,
  isNameMatch,
} from "../../utils/nameNormalizer";

const GstExpenseEntry = () => {
  const [searchParams] = useSearchParams();

  const editId = searchParams.get("editId");

  const [documentId, setDocumentId] = useState(null);

  const [date, setDate] = useState(setCurrentTime(new Date()));
  const [billNo, setBillNo] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [amount, setAmount] = useState("");
  const [gstPercentage, setGstPercentage] = useState(18);
  const [vendorId, setVendorId] = useState("");

  const [vendorList, setVendorList] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadVendors = useCallback(async () => {
    try {
      const res = await getVendors();
      setVendorList(res || []);
    } catch {
      setVendorList([]);
    }
  }, []);

  const loadEditData = useCallback(async (id) => {
    try {
      const data = await getGstExpenseListById(id);

      if (!data) return;

      setDocumentId(data.documentId);
      setDate(data.date);
      setBillNo(data.bill_no);
      setVendorId(data.vendor?.documentId || "");
      setVendorName(data.vendor?.name);
      setAmount(data.base_amount);
      setGstPercentage(data.gst_percentage);
    } catch {
      toast.error("Failed to load expense");
    }
  }, []);

  useEffect(() => {
    loadVendors();

    if (editId) {
      loadEditData(editId);
    }
  }, [editId, loadVendors, loadEditData]);

  const gstSummary = useMemo(() => {
    const amt = Number(amount) || 0;
    const gst = Number(gstPercentage) || 0;

    const tax = (amt * gst) / 100;

    return {
      taxAmount: tax.toFixed(2),
      finalAmount: (amt + tax).toFixed(2),
    };
  }, [amount, gstPercentage]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const finalVendorId = await ensureVendor();

      const payload = {
        bill_no: billNo,
        date,
        vendor: finalVendorId,
        base_amount: Number(amount),
        gst_percentage: Number(gstPercentage),
        tax_amount:
          vendorName === "Tax" ? Number(amount) : Number(gstSummary.taxAmount),
        total_amount:
          vendorName === "Tax"
            ? Number(amount)
            : Math.round(Number(gstSummary.finalAmount)),
        current_status: "status",
      };

      if (documentId) {
        await updateGstExpenseList(documentId, payload);
        toast.success("Expense updated successfully");
      } else {
        const res = await createGstExpenseList(payload);
        setDocumentId(res?.documentId);
        toast.success("Expense created successfully");
      }
    } catch (err) {
      toast.error(err.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDocumentId(null);
    setDate(setCurrentTime(new Date()));
    setBillNo("");
    setVendorName("");
    setVendorId("");
    setAmount("");
    setGstPercentage(18);
  };

  const ensureVendor = async () => {
    const trimmedName = vendorName.trim();
    if (!trimmedName) {
      throw new Error("Vendor name is required");
    }

    // 1. If vendorId is set and matches current name, use it
    if (vendorId) {
      const currentMatch = vendorList.find((v) => v.documentId === vendorId);
      if (currentMatch && isNameMatch(currentMatch.name, trimmedName)) {
        return vendorId;
      }
    }

    // 2. Check in current local vendorList (space-insensitive and case-insensitive)
    const existing = findMatchingEntity(trimmedName, vendorList, "name");
    if (existing) {
      setVendorId(existing.documentId);
      return existing.documentId;
    }

    // 3. Query/Refresh database list before creating to ensure no race or missed items
    try {
      const latestVendors = await getVendors();
      setVendorList(latestVendors || []);
      const foundInLatest = findMatchingEntity(trimmedName, latestVendors, "name");
      if (foundInLatest) {
        setVendorId(foundInLatest.documentId);
        return foundInLatest.documentId;
      }
    } catch (fetchErr) {
      console.warn("Could not refresh vendor list before creation:", fetchErr);
    }

    // 4. Only if not found anywhere, create a new vendor
    const res = await createVendor({
      name: trimmedName,
    });

    setVendorId(res.documentId);
    await loadVendors();

    return res.documentId;
  };

  const handleVendorInputChange = (value) => {
    const formatted = capitalizeFirstLetter(value || "");
    setVendorName(formatted);
    if (vendorId) {
      const currentVendor = vendorList.find((v) => v.documentId === vendorId);
      if (
        currentVendor &&
        !isNameMatch(currentVendor.name, value || "")
      ) {
        setVendorId("");
      }
    }
  };

  const handleVendorBlur = () => {
    const trimmed = (vendorName || "").trim();
    if (!trimmed) {
      setVendorId("");
      return;
    }
    const matched = findMatchingEntity(trimmed, vendorList, "name");
    if (matched) {
      setVendorId(matched.documentId || "");
      setVendorName(matched.name || "");
    } else {
      setVendorId("");
    }
  };

  const handleVendorChange = (value) => {
    if (typeof value === "object" && value) {
      setVendorId(value.documentId || "");
      setVendorName(value.name || "");
    } else if (typeof value === "string" && value) {
      const matched = findMatchingEntity(value, vendorList, "name");
      if (matched) {
        setVendorId(matched.documentId || "");
        setVendorName(matched.name || "");
      } else {
        setVendorName(capitalizeFirstLetter(value));
        setVendorId("");
      }
    } else {
      setVendorName("");
      setVendorId("");
    }
  };

  return (
    <MainLayout>
      <div className="flex justify-between">
        <h1 className="text-2xl font-medium">GST Expense Entry</h1>

        <div className="flex justify-end">
          <Button
            type="button"
            label="Add New"
            onClick={resetForm}
            icon1={<AddIcon color="#fff" />}
            icon2={<AddIcon color="#fff" />}
            className="bg-blue-600 text-white"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 mt-4">
        <div className="grid grid-cols-7 gap-4">
          <DateUiPicker
            value={date}
            label="Date"
            onChange={(d) => setDate(setCurrentTime(d))}
          />

          <InputField
            value={billNo}
            placeholder="Bill No"
            onChange={(e) => setBillNo(e.target.value)}
          />

          <AutocompleteField
            label="Seller Name"
            value={vendorName}
            options={vendorList}
            required
            onInputChange={(e, value) => handleVendorInputChange(value)}
            onChange={(e, value) => handleVendorChange(value)}
            onBlur={handleVendorBlur}
            getOptionLabel={(option) =>
              typeof option === "string" ? option : option?.name || ""
            }
          />

          <InputField
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <InputField
            placeholder="GST %"
            value={gstPercentage}
            onChange={(e) => setGstPercentage(e.target.value)}
            disabled={vendorName === "Tax"}
          />

          <InputField
            placeholder="Total Amount"
            value={Math.round(Number(gstSummary.finalAmount))}
            readOnly
          />

          <div className="flex items-center gap-2">
            <Button
              type={"submit"}
              label={editId ? "Update" : "Save"}
              disabled={loading}
              icon1={<SaveIcon color="#fff" />}
              icon2={<SaveIcon color="#fff" />}
              className={
                "bg-[#4F46E5] hover:bg-[#4338CA] text-white h-max mt-2 w-full"
              }
            />
          </div>
        </div>
      </form>
    </MainLayout>
  );
};

export default GstExpenseEntry;
