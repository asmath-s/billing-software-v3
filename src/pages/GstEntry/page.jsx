import { toPng } from "html-to-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";

import Button from "../../components/Button/Button";
import CustomerField from "../../components/CustomerField/CustomerField";
import { DateUiPicker } from "../../components/Datepicker/Datepicker";
import FormDataInput from "../../components/FormDataInput/FormDataInput";
import InputField from "../../components/InputField/InputField";
import MainLayout from "../../layouts/MainLayout";

import DialogContent from "@mui/joy/DialogContent";
import DialogTitle from "@mui/joy/DialogTitle";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import Stack from "@mui/joy/Stack";

import {
  AddIcon,
  PrinterIcon,
  SaveIcon,
  SavePdfIcon,
} from "../../components/icons";

import { useAuth } from "../../context/auth-context";
import { GSTSALESENTRY } from "../../router/paths";
import { setCurrentTime } from "../../utils/DatewithTime";
import { formattedAmount } from "../../utils/FormatAmount";
import { transformBillingData } from "../../utils/transformBillingData";

import { createGstCustomer, getGstCustomers } from "../../api/gstCustomer";

import {
  createGstList,
  getGstListById,
  getLastGstList,
  updateGstList,
} from "../../api/gstList";
import PrintGstPdfUi from "../../components/PrintGstPdfUI/PrintGstPdfUi";
import PrintGstUi from "../../components/PrintGstUI/PrintGstUi";

const toNumber = (val) => Number(val) || 0;

const DEFAULTS = {
  HSN: "3910",
  UOM: "NOS",
  GST: "18",
  METHOD: "gst",
};

const GstEntry = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("editId");

  const printRef = useRef(null);
  const contentRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [documentId, setDocumentId] = useState(null);

  const [billNo, setBillNo] = useState("");
  const [date, setDate] = useState(setCurrentTime(new Date()));
  const [hsnCode, setHsnCode] = useState(DEFAULTS.HSN);
  const [uom, setUom] = useState(DEFAULTS.UOM);
  const [gstPercentage, setGstPercentage] = useState(DEFAULTS.GST);
  const [method, setMethod] = useState(DEFAULTS.METHOD);

  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [gstNo, setGstNo] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const [customerList, setCustomerList] = useState([]);
  const [sizeData, setSizeData] = useState([]);

  const [status, setStatus] = useState("status");

  const [copyType, setCopyType] = useState("original");
  const [openCopyModal, setOpenCopyModal] = useState(false);
  const [actionType, setActionType] = useState("");
  /* ================= CALCULATIONS ================= */

  const totalAmount = useMemo(() => {
    return sizeData.reduce(
      (sum, item) => sum + toNumber(item.per_piece_total),
      0,
    );
  }, [sizeData]);

  const gstSummary = useMemo(() => {
    const gst = toNumber(gstPercentage);

    const totalGST = (totalAmount * gst) / 100;

    const final = totalAmount + totalGST;

    const rounded = Math.round(final);
    const roundOff = +(rounded - final).toFixed(2);

    return {
      taxAmount: totalGST.toFixed(2),
      finalAmount: rounded.toFixed(2),
      roundOff: roundOff.toFixed(2),
    };
  }, [totalAmount, gstPercentage]);
  /* ================= API ================= */

  const loadCustomers = useCallback(async () => {
    try {
      const res = await getGstCustomers();
      setCustomerList(res || []);
    } catch {
      setCustomerList([]);
    }
  }, []);

  const loadLastBillNo = useCallback(async () => {
    try {
      const res = await getLastGstList();
      const last = res?.[0]?.bill_no;
      setBillNo(String((Number(last) || 0) + 1));
    } catch {
      setBillNo("1");
    }
  }, []);

  const loadEditData = useCallback(async (id) => {
    try {
      const res = await getGstListById(id);
      const data = res;

      if (!data) return;

      const transformed = transformBillingData(data);

      setDocumentId(data.documentId);
      setBillNo(data.bill_no);
      setDate(data.date);
      setHsnCode(data.hsn_code);
      setUom(data.uom);
      setMethod(data.method || DEFAULTS.METHOD);

      setCustomerId(data.gst_customer?.documentId || "");
      setCustomerName(data.gst_customer?.name || "");
      setAddress(data.gst_customer?.address || "");
      setDeliveryAddress(data.gst_customer?.delivery_address || "");
      setGstNo(data.gst_customer?.gst_no || "");
      setSizeData(transformed.size_data || []);
      setStatus(data.current_status || "status");
    } catch {
      toast.error("Failed to load entry");
    }
  }, []);

  useEffect(() => {
    loadCustomers();

    if (editId) {
      loadEditData(editId);
    } else {
      loadLastBillNo();
    }
  }, [editId, loadCustomers, loadEditData, loadLastBillNo]);

  const handlePrintClick = () => {
    setActionType("print");
    setOpenCopyModal(true);
  };

  const handlePdfClick = () => {
    setActionType("pdf");
    setOpenCopyModal(true);
  };

  const handleCopySelection = async (type) => {
    setCopyType(type);
    setOpenCopyModal(false);

    // wait for state update
    setTimeout(async () => {
      if (actionType === "print") {
        handlePrint();
      }

      if (actionType === "pdf") {
        await downloadImage();
      }
    }, 100);
  };

  /* ================= HELPERS ================= */

  const buildParticulars = () => {
    return sizeData
      .map((item) => {
        if (item.type === "instruction") {
          return {
            text: `${item.instruction} - ${item.piece_count} pcs - ${formattedAmount(item.per_piece_total)}`,
          };
        }

        if (item.type === "flex") {
          return {
            text: `${item.width} x ${item.height} ${item.material} - ${item.sq_ft_price} sqft - ${item.piece_count} pcs - ${formattedAmount(item.per_piece_total)}`,
          };
        }

        return null;
      })
      .filter(Boolean);
  };

  const ensureCustomer = async () => {
    if (customerId) return customerId;

    if (!customerName.trim()) {
      throw new Error("Customer name is required");
    }

    const res = await createGstCustomer({
      name: customerName,
      address,
      delivery_address: deliveryAddress,
      gst_no: gstNo,
    });

    setCustomerId(res?.documentId);
    await loadCustomers();

    return res?.documentId;
  };

  /* ================= ACTIONS ================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!sizeData.length) {
      toast.error("Add at least one item");
      return;
    }

    try {
      setLoading(true);

      const finalCustomerId = await ensureCustomer();

      const payload = {
        bill_no: billNo,
        date,
        hsn_code: hsnCode,
        uom,
        method,
        gst_customer: finalCustomerId,
        size_data: sizeData,
        gst_percentage: gstPercentage,
        total_amount: gstSummary.finalAmount,
        tax_amount: gstSummary.taxAmount,
        base_amount: totalAmount,
        round_off: gstSummary.roundOff,
        particulars: buildParticulars(),
        current_status: status,
      };

      if (documentId) {
        await updateGstList(documentId, payload);
        toast.success("Updated successfully");
      } else {
        const created = await createGstList(payload);
        setDocumentId(created?.documentId);
        toast.success("Created successfully");
      }
    } catch (err) {
      toast.error(err.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Bill-${billNo}`,
  });

  const downloadImage = async () => {
    if (!printRef.current) return;

    try {
      const dataUrl = await toPng(printRef.current, {
        pixelRatio: 3,
        backgroundColor: "#ffffff",
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.download = `Invoice-${billNo}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      toast.error("Export failed");
    }
  };

  const resetForm = async () => {
    setDocumentId(null);
    setDate(setCurrentTime(new Date()));
    setHsnCode(DEFAULTS.HSN);
    setUom(DEFAULTS.UOM);
    setMethod(DEFAULTS.METHOD);

    setCustomerId("");
    setCustomerName("");
    setAddress("");
    setDeliveryAddress("");
    setGstNo("");
    setSizeData([]);

    await loadLastBillNo();
    navigate(GSTSALESENTRY);
  };

  /* ================= UI ================= */

  return (
    <MainLayout>
      <h1 className="text-2xl font-medium">GST Entry</h1>

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

      <form onSubmit={handleSubmit} className="space-y-6 mt-4">
        <div className="grid grid-cols-4 gap-4">
          <InputField
            value={billNo}
            placeholder="Bill No"
            disabled={role !== "superadmin"}
            onChange={(e) => setBillNo(e.target.value)}
          />

          <DateUiPicker
            value={date}
            label="Date"
            onChange={(d) => setDate(setCurrentTime(d))}
            minDate={role === "superadmin" ? undefined : new Date()}
          />

          <InputField
            value={hsnCode}
            placeholder="HSN Code"
            onChange={(e) => setHsnCode(e.target.value)}
          />

          <InputField
            value={uom}
            placeholder="UOM"
            onChange={(e) => setUom(e.target.value)}
          />
        </div>

        <CustomerField
          isGstCustomer
          customerData={customerList}
          fetchCustomers={loadCustomers}
          setCustomerData={setCustomerList}
          SelectCustomerID={customerId}
          setSelectedCustomerID={setCustomerId}
          customerName={customerName}
          setCustomerName={setCustomerName}
          gstNo={gstNo}
          setGstNo={setGstNo}
          address={address}
          setAddress={setAddress}
          deliveryAddress={deliveryAddress}
          setDeliveryAddress={setDeliveryAddress}
        />

        <FormDataInput sizeData={sizeData} setSizeData={setSizeData} />

        <div className="grid grid-cols-3 gap-4">
          <InputField
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="Method"
          />
          <InputField
            value={gstPercentage}
            onChange={(e) => setGstPercentage(e.target.value)}
            placeholder="GST %"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <InputField value={totalAmount} readOnly placeholder="Amount" />
          <InputField value={gstSummary.taxAmount} readOnly placeholder="Tax" />
          <InputField
            value={gstSummary.finalAmount}
            readOnly
            placeholder="Total"
          />
        </div>

        <div className="flex justify-end gap-4">
          {documentId && (
            <>
              <Button
                type="button"
                label="PDF"
                onClick={handlePdfClick}
                icon1={<SavePdfIcon color="#fff" />}
                icon2={<SavePdfIcon color="#fff" />}
                className="bg-green-600 text-white"
              />

              <Button
                type="button"
                label="Print"
                onClick={handlePrintClick}
                icon1={<PrinterIcon color="#fff" />}
                icon2={<PrinterIcon color="#fff" />}
                className="bg-teal-500 text-white"
              />
            </>
          )}

          <Button
            type="submit"
            label={documentId ? "Update" : "Save"}
            disabled={loading}
            icon1={<SaveIcon color="#fff" />}
            icon2={<SaveIcon color="#fff" />}
            className="bg-indigo-600 text-white"
          />
        </div>
      </form>

      <PrintGstUi
        ref={contentRef}
        billNo={billNo}
        date={date}
        name={customerName}
        address={address}
        deliveryAddress={deliveryAddress}
        gstNo={gstNo}
        sizeData={sizeData}
        hsn={hsnCode}
        uom={uom}
        method={method}
        gstPercentage={gstPercentage}
        baseAmount={totalAmount}
        taxAmount={gstSummary.taxAmount}
        less={gstSummary.roundOff}
        finalAmount={gstSummary.finalAmount}
        printStatus={copyType === "original" ? "ORIGINAL" : "DUPLICATE"}
      />

      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <PrintGstPdfUi
          ref={printRef}
          billNo={billNo}
          date={date}
          name={customerName}
          address={address}
          deliveryAddress={deliveryAddress}
          gstNo={gstNo}
          sizeData={sizeData}
          hsn={hsnCode}
          uom={uom}
          method={method}
          gstPercentage={gstPercentage}
          baseAmount={totalAmount}
          taxAmount={gstSummary.taxAmount}
          less={gstSummary.roundOff}
          finalAmount={gstSummary.finalAmount}
          printStatus={copyType === "original" ? "ORIGINAL" : "DUPLICATE"}
        />
      </div>
      <Modal open={openCopyModal} onClose={() => setOpenCopyModal(false)}>
        <ModalDialog size="md">
          <DialogTitle>Select Copy Type</DialogTitle>

          <DialogContent>
            Choose whether to print/download the Original or Duplicate copy.
          </DialogContent>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              label="Original"
              onClick={() => handleCopySelection("original")}
              className="bg-green-600 text-white"
            />

            <Button
              label="Duplicate"
              onClick={() => handleCopySelection("duplicate")}
              className="bg-orange-500 text-white"
            />
          </Stack>
        </ModalDialog>
      </Modal>
    </MainLayout>
  );
};

export default GstEntry;
