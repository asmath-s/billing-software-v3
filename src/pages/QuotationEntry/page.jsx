import { toPng } from "html-to-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";

import Button from "../../components/Button/Button";
import { DateUiPicker } from "../../components/Datepicker/Datepicker";
import DynamicQuotationTable from "../../components/DynamicQuotationTable/DynamicQuotationTable";
import InputField from "../../components/InputField/InputField";
import QuotationPrint from "../../components/QuotationPrint/QuotationPrint";
import RichTextEditor from "../../components/RichTextEditor/RichTextEditor";
import MainLayout from "../../layouts/MainLayout";

import {
  AddIcon,
  PrinterIcon,
  SaveIcon,
  SavePdfIcon,
} from "../../components/icons";

import {
  createInitialQuotationRow,
  createQuotation,
  getNextQuotationNo,
  getQuotationById,
  updateQuotation,
} from "../../api/quotationStorage";
import { QUOTATIONENTRY } from "../../router/paths";
import { setCurrentTime } from "../../utils/DatewithTime";

const DEFAULT_TOP_TEXT = `<p><strong>Dear Valued Customer,</strong></p><p>Thank you for your enquiry. We are pleased to submit our best quotation for your requirement as detailed below:</p>`;

const DEFAULT_BOTTOM_TEXT = `<p><strong>Terms &amp; Conditions:</strong></p><ol><li><strong>Payment:</strong> 50% advance along with confirmed work order, balance before delivery.</li><li><strong>Delivery:</strong> Within 3 to 5 business days after artwork confirmation.</li><li><strong>Artwork &amp; Design:</strong> Client approved proof will be considered final for production.</li><li><strong>Validity:</strong> This quotation is valid for 15 days from the date of issue.</li><li><strong>Taxes:</strong> GST extra as applicable.</li></ol>`;

const DEFAULT_COLUMNS = [
  {
    id: "col_sno",
    label: "S.No",
    key: "sno",
    align: "center",
    width: "8%",
    type: "text",
  },
  {
    id: "col_desc",
    label: "Description / Particulars",
    key: "description",
    align: "left",
    width: "48%",
    type: "multiline",
  },
  {
    id: "col_qty",
    label: "Qty",
    key: "qty",
    align: "center",
    width: "12%",
    type: "number",
  },
  {
    id: "col_rate",
    label: "Rate (₹)",
    key: "rate",
    align: "right",
    width: "16%",
    type: "number",
  },
  {
    id: "col_amount",
    label: "Amount (₹)",
    key: "amount",
    align: "right",
    width: "16%",
    type: "amount",
  },
];

const QuotationEntry = () => {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("editId");
  const navigate = useNavigate();

  const printRef = useRef(null);
  const imageRef = useRef(null);

  const [loading, setLoading] = useState(false);
  // Meta details
  const [quotationNo, setQuotationNo] = useState("");
  const [date, setDate] = useState(setCurrentTime(new Date()));

  // Customer details (plain text fields)
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  // Rich Text Editors
  const [topText, setTopText] = useState(DEFAULT_TOP_TEXT);
  const [bottomText, setBottomText] = useState(DEFAULT_BOTTOM_TEXT);

  // Dynamic Table
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [rows, setRows] = useState([createInitialQuotationRow(1)]);
  const [taxPercent, setTaxPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Load existing quote or generate new Quote No
  const loadQuotation = useCallback(async (id) => {
    try {
      setLoading(true);
      const data = await getQuotationById(id);
      if (!data) {
        toast.error("Quotation not found");
        return;
      }

      setQuotationNo(data.quotationNo || "");
      setDate(data.date ? new Date(data.date) : new Date());

      setCustomerName(data.customerName || "");
      setAddress(data.address || "");
      setPhone(data.phone || "");

      setTopText(data.topText !== undefined ? data.topText : DEFAULT_TOP_TEXT);
      setBottomText(
        data.bottomText !== undefined ? data.bottomText : DEFAULT_BOTTOM_TEXT,
      );

      if (
        data.columns &&
        Array.isArray(data.columns) &&
        data.columns.length > 0
      ) {
        setColumns(data.columns);
      }
      if (data.rows && Array.isArray(data.rows) && data.rows.length > 0) {
        setRows(data.rows);
      }
      setTaxPercent(data.taxPercent || 0);
      setDiscountAmount(data.discountAmount || 0);
    } catch (err) {
      console.error("Failed to load quotation:", err);
      toast.error("Failed to load quotation");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (editId) {
      loadQuotation(editId);
    } else {
      (async () => {
        const nextNo = await getNextQuotationNo();
        setQuotationNo(nextNo);
      })();
    }
  }, [editId, loadQuotation]);

  // Save / Update Quotation
  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!customerName.trim()) {
      toast.error("Customer name is required.");
      return;
    }

    if (rows.length === 0) {
      toast.error("Please add at least one item to the quotation.");
      return;
    }

    setLoading(true);
    try {
      const qNo = quotationNo || (await getNextQuotationNo());
      const payload = {
        quotationNo: qNo,
        date: date
          ? new Date(date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        customerName: customerName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        topText,
        columns,
        rows,
        taxPercent,
        discountAmount,
        bottomText,
      };

      if (editId) {
        await updateQuotation(editId, payload);
        toast.success("Quotation updated successfully!");
      } else {
        const created = await createQuotation(payload);
        toast.success("Quotation created successfully!");
        navigate(
          `${QUOTATIONENTRY}?editId=${created.documentId || created.id}`,
          { replace: true },
        );
      }
    } catch (err) {
      console.error("Save quotation error:", err);
      toast.error("Failed to save quotation.");
    } finally {
      setLoading(false);
    }
  };

  // Print Trigger
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Quotation-${quotationNo}`,
  });

  // Save As Image (PNG)
  const downloadImage = async () => {
    if (!imageRef.current) return;
    try {
      const dataUrl = await toPng(imageRef.current, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      });

      if (!dataUrl || dataUrl === "data:," || dataUrl.length < 500) {
        toast.error("Failed to generate image. Please try again.");
        return;
      }

      const link = document.createElement("a");
      link.download = `Quotation-${quotationNo || "Draft"}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Quotation image downloaded successfully!");
    } catch (err) {
      console.error("Export image failed", err);
      toast.error("Failed to export image.");
    }
  };

  // Clear / Add New
  const handleClear = async () => {
    setDate(setCurrentTime(new Date()));

    setCustomerName("");
    setAddress("");
    setPhone("");

    setTopText(DEFAULT_TOP_TEXT);
    setBottomText(DEFAULT_BOTTOM_TEXT);

    setColumns(DEFAULT_COLUMNS);
    setRows([createInitialQuotationRow(1)]);
    setTaxPercent(0);
    setDiscountAmount(0);

    const nextNo = await getNextQuotationNo();
    setQuotationNo(nextNo);
    navigate(QUOTATIONENTRY);
  };

  const quotationProps = {
    quotationNo,
    date,
    customerName,
    address,
    phone,
    topText,
    columns,
    rows,
    taxPercent,
    discountAmount,
    bottomText,
  };

  return (
    <MainLayout>
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {editId ? "Edit Quotation" : "Quotation Entry"}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Create professional quotations with rich text editors, dynamic
            tables, and custom branding.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            label="New Quote"
            icon1={<AddIcon color="#fff" />}
            icon2={<AddIcon color="#fff" />}
            className="bg-blue-600 hover:bg-blue-700 text-white border-0"
            onClick={handleClear}
          />
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ────────────────── SECTION 1: QUOTATION & CUSTOMER DETAILS ────────────────── */}
        <div className="bg-white border border-[#E0E1E3] rounded-lg p-5 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-2.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
              Client Information
            </h2>
          </div>

          {/* Quotation Numbers & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DateUiPicker
              label="Quotation Date"
              value={date}
              onChange={(d) => setDate(setCurrentTime(d))}
            />
          </div>

          {/* Client Details Grid: Customer Name -> Address -> Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
            <InputField
              label="Customer / Client Name *"
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />

            <InputField
              label="Billing / Delivery Address"
              placeholder="Enter customer address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <InputField
              label="Contact Phone"
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        {/* ────────────────── SECTION 2: TOP RICH TEXT EDITOR ────────────────── */}
        <div className="space-y-1.5">
          <RichTextEditor
            label="  Top Content"
            value={topText}
            onChange={setTopText}
            placeholder="Type introductory message, enquiry reference, project specifications..."
            minHeight="140px"
          />
        </div>

        {/* ────────────────── SECTION 3: DYNAMIC QUOTATION TABLE ────────────────── */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold uppercase tracking-wider text-gray-700">
              Table
            </label>
          </div>
          <DynamicQuotationTable
            columns={columns}
            onColumnsChange={setColumns}
            rows={rows}
            onRowsChange={setRows}
            taxPercent={taxPercent}
            onTaxPercentChange={setTaxPercent}
            discountAmount={discountAmount}
            onDiscountAmountChange={setDiscountAmount}
          />
        </div>

        {/* ────────────────── SECTION 4: BOTTOM RICH TEXT EDITOR ────────────────── */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold uppercase tracking-wider text-gray-700">
              4. Bottom Content (Terms & Conditions, Notes, Payment Details)
            </label>
            <span className="text-xs text-gray-500">
              Formatting and line breaks are fully preserved
            </span>
          </div>
          <RichTextEditor
            label="Terms, Conditions & Payment Information Editor"
            value={bottomText}
            onChange={setBottomText}
            placeholder="Enter terms, delivery timelines, payment bank account details, notes..."
            minHeight="150px"
          />
        </div>

        {/* ────────────────── FORM ACTION BUTTONS ────────────────── */}
        <div className="flex flex-wrap items-center justify-end gap-3 bg-white border border-[#E0E1E3] rounded-lg p-4 shadow-xs">
          {editId && (
            <>
              <Button
                type="button"
                label="Save As Image"
                icon1={<SavePdfIcon color="white" />}
                icon2={<SavePdfIcon color="white" />}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                onClick={downloadImage}
              />

              <Button
                type="button"
                label="Print Quotation"
                icon1={<PrinterIcon color="white" />}
                icon2={<PrinterIcon color="white" />}
                className="bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                onClick={handlePrint}
              />
            </>
          )}

          <Button
            type="submit"
            label={
              loading
                ? editId
                  ? "Updating..."
                  : "Saving..."
                : editId
                  ? "Update Quotation"
                  : "Save Quotation"
            }
            icon1={<SaveIcon color="white" />}
            icon2={<SaveIcon color="white" />}
            disabled={loading}
            className="bg-[#0b6bcb] text-white border-0"
          />
        </div>
      </form>

      {/* ────────────────── SECTION 5: LIVE PREVIEW ON THE BOTTOM ────────────────── */}
      <div className="mt-8 bg-white border border-[#E0E1E3] rounded-lg p-5 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
            5. Live Quotation Preview
          </h2>
          <p className="text-xs text-gray-500">
            Real-time representation of your document as it will appear when
            printed or shared.
          </p>
        </div>

        <div className="p-4 sm:p-8 bg-gray-100 rounded-lg flex justify-center overflow-x-auto border border-gray-200">
          <div className="bg-white shadow-md">
            <QuotationPrint {...quotationProps} />
          </div>
        </div>
      </div>

      {/* Hidden Print Component */}
      <div style={{ display: "none" }}>
        <QuotationPrint ref={printRef} {...quotationProps} />
      </div>

      {/* Offscreen Image Component for html-to-image PNG Export */}
      <div
        style={{
          position: "fixed",
          left: "-12000px",
          top: "0px",
          width: "210mm",
          zIndex: -1,
          opacity: 1,
          pointerEvents: "none",
        }}
      >
        <QuotationPrint ref={imageRef} {...quotationProps} />
      </div>
    </MainLayout>
  );
};

export default QuotationEntry;
