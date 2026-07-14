import {
  createGstExpenseList,
  getGstExpenseListById,
  updateGstExpenseList,
} from "../../api/gstExpense";
import MainLayout from "../../layouts/MainLayout";

import { createVendor, getVendors } from "../../api/vendor";

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import AutocompleteField from "../../components/AutocompleteField/AutocompleteField";
import Button from "../../components/Button/Button";
import { DateUiPicker } from "../../components/Datepicker/Datepicker";
import { AddIcon, SaveIcon } from "../../components/icons";
import InputField from "../../components/InputField/InputField";
import { capitalizeFirstLetter } from "../../utils/Captialize";
import { setCurrentTime } from "../../utils/DatewithTime";

const GstExpenseEntry = () => {
  const navigate = useNavigate();
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

  useEffect(() => {
    loadVendors();

    if (editId) {
      loadEditData(editId);
    }
  }, [editId]);

  const loadVendors = async () => {
    try {
      const res = await getVendors();
      setVendorList(res || []);
    } catch {
      setVendorList([]);
    }
  };

  const loadEditData = async (id) => {
    try {
      const data = await getGstExpenseListById(id);
      console.log(data);

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
  };

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
            : Number(gstSummary.finalAmount),
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
    setAmount("");
    setGstPercentage(18);
  };

  const ensureVendor = async () => {
    if (vendorId) return vendorId;

    if (!vendorName.trim()) {
      throw new Error("Vendor name is required");
    }

    const res = await createVendor({
      name: vendorName,
    });

    setVendorId(res.documentId);

    await loadVendors();

    return res.documentId;
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
            onInputChange={(e, value) => {
              setVendorName(capitalizeFirstLetter(value));
            }}
            onChange={(e, value) => {
              if (typeof value === "object" && value) {
                setVendorId(value.documentId);
                setVendorName(value.name);
              } else {
                setVendorId("");
                setVendorName(capitalizeFirstLetter(value || ""));
              }
            }}
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
            value={gstSummary.finalAmount}
            readOnly
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
    </MainLayout>
  );
};

export default GstExpenseEntry;
