import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";

import Button from "../../components/Button/Button";
import CurrencyConverter from "../../components/CurrencyConverter/CurrencyConverter";
import CustomerField from "../../components/CustomerField/CustomerField";
import { DateUiPicker } from "../../components/Datepicker/Datepicker";
import FormDataInput from "../../components/FormDataInput/FormDataInput";
import InputField from "../../components/InputField/InputField";
import PrintUi from "../../components/PrintUi/PrintUi";
import PrintUipdf from "../../components/PrintUipdf/PrintUipdf";
import MainLayout from "../../layouts/MainLayout";

import {
  AddIcon,
  CashIcon,
  DeleteIcon,
  GpayIcon,
  PrinterIcon,
  SaveIcon,
  SavePdfIcon,
} from "../../components/icons";

import { createCustomer, getCustomers } from "../../api/customer";
import {
  createLocalList,
  getLastLocalList,
  getLocalListById,
  updateLocalList,
} from "../../api/localList";

import { toPng } from "html-to-image";

import { useAuth } from "../../context/auth-context";
import { LOCALENTRY } from "../../router/paths";
import { setCurrentTime } from "../../utils/DatewithTime";
import { formattedAmount } from "../../utils/FormatAmount";
import { transformBillingData } from "../../utils/transformBillingData";

const num = (v) => Number(v) || 0;

const LocalEntry = () => {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("editId");

  const navigate = useNavigate();
  const { role } = useAuth();

  const contentRef = useRef(null);
  const printRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [documentId, setDocumentId] = useState(null);

  const [billNo, setBillNo] = useState("");
  const [date, setDate] = useState(setCurrentTime(new Date()));
  const [note, setNote] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [customerList, setCustomerList] = useState([]);

  const [sizeData, setSizeData] = useState([]);

  const [cashData, setCashData] = useState([{ date: null, amount: 0 }]);
  const [gpayData, setGpayData] = useState([{ date: null, amount: 0 }]);

  const [cashErrorMsg, setCashErrorMsg] = useState("");
  const [gpayErrorMsg, setGpayErrorMsg] = useState("");

  const [status, setStatus] = useState("status");

  const [error, setError] = useState("");

  const loadLastBillNo = useCallback(async () => {
    try {
      const res = await getLastLocalList();
      const lastEntry = res?.[0];

      if (lastEntry?.bill_no) {
        const lastBill = Number(lastEntry.bill_no) || 0;
        setBillNo(String(lastBill + 1));
      } else {
        setBillNo("1");
      }
    } catch {
      setBillNo("1");
    }
  }, []);

  const totalAmount = useMemo(() => {
    const sizeTotal = sizeData.reduce(
      (sum, item) => sum + num(item.per_piece_total),
      0,
    );

    return sizeTotal;
  }, [sizeData]);

  const receivedAmount = useMemo(() => {
    const cashTotal = cashData.reduce((sum, item) => sum + num(item.amount), 0);
    const gpayTotal = gpayData.reduce((sum, item) => sum + num(item.amount), 0);
    return cashTotal + gpayTotal;
  }, [cashData, gpayData]);

  const balanceAmount = useMemo(() => {
    return Math.round(totalAmount) - receivedAmount;
  }, [totalAmount, receivedAmount]);

  useEffect(() => {
    if (balanceAmount < 0) {
      setError("Balance cannot be negative");
    } else {
      setError("");
    }
  }, [balanceAmount]);

  const loadCustomers = useCallback(async () => {
    try {
      const data = await getCustomers();
      setCustomerList(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomerList([]);
    }
  }, []);

  const loadEditData = useCallback(async (id) => {
    try {
      const res = await getLocalListById(id);

      const data = res?.data?.[0] || res?.data || res;

      if (!data) return;

      setDocumentId(data.documentId);
      setBillNo(data.bill_no);
      setDate(data.date);
      setNote(data.note);

      setCustomerName(data.customer?.name);
      setPhone(data.customer?.phonenumber);

      const cleanedData = transformBillingData(data);

      setCustomerId(cleanedData.customer || "");

      setSizeData(cleanedData.size_data || []);

      setCashData(
        cleanedData.cash.length > 0
          ? cleanedData.cash
          : [{ date: null, amount: 0 }],
      );

      setGpayData(
        cleanedData.gpay.length > 0
          ? cleanedData.gpay
          : [{ date: null, amount: 0 }],
      );

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (sizeData.length === 0) {
      toast.error("Please add at least one size");
      return;
    }

    if (error) {
      toast.error(error);
      return;
    }

    const validatePaymentData = (data, type) => {
      const cleaned = [];

      for (const item of data) {
        const amount = Number(item.amount || 0);
        const date = item.date;

        if (!date && amount === 0) continue;

        if (date && amount === 0) {
          toast.error(`Please fill ${type} amount properly`);
          return null;
        }

        if (amount > 0 && !date) {
          toast.error(`Please select ${type} date`);
          return null;
        }

        cleaned.push(item);
      }

      return cleaned;
    };

    const validCash = validatePaymentData(cashData, "cash");
    if (!validCash) return;

    const validGpay = validatePaymentData(gpayData, "gpay");
    if (!validGpay) return;

    try {
      setLoading(true);

      let finalCustomerId = customerId;

      if (!customerId) {
        if (!customerName.trim()) {
          toast.error("Customer name is required");
          return;
        }

        const createdCustomer = await createCustomer({
          name: customerName,
          phonenumber: phone,
        });

        finalCustomerId = createdCustomer?.documentId;
        setCustomerId(finalCustomerId);

        await loadCustomers();
      }

      const particulars = sizeData
        .map((s) => {
          if (s.type === "instruction") {
            return {
              text: `${s.instruction} - ${s.piece_count} pcs - ${formattedAmount(
                s.per_piece_total,
              )}`,
            };
          }

          if (s.type === "flex") {
            return {
              text: `${s.width} x ${s.height} ${s.material} - ${s.sq_ft_price} sqft - ${s.piece_count} pcs - ${formattedAmount(
                s.per_piece_total,
              )}`,
            };
          }

          return null;
        })
        .filter(Boolean);

      const payload = {
        bill_no: billNo,
        date,
        note,
        customer: finalCustomerId,
        size_data: sizeData,
        cash: validCash,
        gpay: validGpay,
        received_amount: receivedAmount,
        balance_amount: balanceAmount,
        total_amount: totalAmount,
        particulars,
        current_status: status,
      };

      if (!documentId) {
        const created = await createLocalList(payload);
        setDocumentId(created?.documentId);
        toast.success("Local list created successfully");
      } else {
        await updateLocalList(documentId, payload);
        toast.success("Local list updated successfully");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Bill-${billNo}`,
  });

  const downloadImage = async () => {
    if (printRef.current === null) return;

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
    } catch (err) {
      console.error("Export failed", err);
    }
  };
  const clearForm = async () => {
    setDocumentId(null);
    setDate(setCurrentTime(new Date()));
    setNote("");

    setCustomerId("");
    setCustomerName("");
    setPhone("");

    setSizeData([]);

    setCashData([{ date: null, amount: 0 }]);
    setGpayData([{ date: null, amount: 0 }]);

    await loadLastBillNo();

    navigate(LOCALENTRY);
  };

  const handleAddCashRow = () => {
    setCashErrorMsg("");
    const lastRow = cashData[cashData.length - 1];

    if (!lastRow.date || !lastRow.amount) {
      setCashErrorMsg("Please fill out the previous Cash row.");
      return;
    }

    setCashData((prev) => [...prev, { date: null, amount: 0 }]);
  };

  const handleAddGpayRow = () => {
    setGpayErrorMsg("");
    const lastRow = gpayData[gpayData.length - 1];

    if (!lastRow.date || !lastRow.amount) {
      setGpayErrorMsg("Please fill out the previous Gpay row.");
      return;
    }

    setGpayData((prev) => [...prev, { date: null, amount: 0 }]);
  };

  const handleCashChange = (index, eventOrValue, field = "amount") => {
    setCashData((prev) => {
      const updated = [...prev];

      if (field === "date") {
        updated[index].date = eventOrValue;
      } else {
        const val = eventOrValue.target.value;
        updated[index].amount = val === "" ? "" : Number(val);
      }

      return updated;
    });
  };

  const handleGpayChange = (index, eventOrValue, field = "amount") => {
    setGpayData((prev) => {
      const updated = [...prev];

      if (field === "date") {
        updated[index].date = eventOrValue;
      } else {
        const val = eventOrValue.target.value;
        updated[index].amount = val === "" ? "" : Number(val);
      }

      return updated;
    });
  };

  const handleRemoveCashRow = (index) => {
    setCashData((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRemoveGpayRow = (index) => {
    setGpayData((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  return (
    <MainLayout>
      <h1 className="text-2xl font-medium">Local Entry</h1>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={clearForm}
          label="Add New"
          icon1={<AddIcon color="#fff" />}
          icon2={<AddIcon color="#fff" />}
          className="bg-[#0b6bcb] text-white border-0"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 mt-4">
        <div className="grid grid-cols-4 gap-4 my-2">
          <DateUiPicker
            value={date}
            label="Date"
            disabled={role !== "superadmin"}
            onChange={(d) => setDate(setCurrentTime(d))}
          />

          <InputField
            placeholder="Bill No"
            value={billNo}
            disabled={role !== "superadmin"}
            onChange={(e) => setBillNo(e.target.value)}
          />

          <InputField
            placeholder="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <CustomerField
          customerData={customerList}
          fetchCustomers={loadCustomers}
          setCustomerData={setCustomerList}
          SelectCustomerID={customerId}
          setSelectedCustomerID={setCustomerId}
          customerName={customerName}
          setCustomerName={setCustomerName}
          phoneno={phone}
          setPhoneno={setPhone}
        />

        <FormDataInput sizeData={sizeData} setSizeData={setSizeData} />

        <div className="grid grid-cols-4 gap-4 mt-4 mb-12">
          <CurrencyConverter
            amount={Math.round(totalAmount)}
            label="Total Amount"
          />
          <CurrencyConverter amount={receivedAmount} label="Received Amount" />
          <CurrencyConverter
            amount={Math.round(balanceAmount)}
            label="Balance Amount"
            error={error}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border-r-2 border-gray-300">
            <div>
              {cashData.map((row, index) => (
                <div className="grid grid-cols-3 gap-3 mb-2" key={index}>
                  <div className="flex flex-col col-span-1 relative">
                    <DateUiPicker
                      value={row.date ? dayjs(row.date) : null}
                      onChange={(val) =>
                        handleCashChange(
                          index,
                          val ? setCurrentTime(val) : null,
                          "date",
                        )
                      }
                      label="Cash Date"
                      minDate={role === "superadmin" ? undefined : new Date()}
                      isClearable={true}
                      className={`disabled:cursor-not-allowed disabled:text-gray-400 disabled:border-gray-400`}
                    />
                  </div>
                  <div className="flex gap-2 col-span-2 mr-3">
                    <InputField
                      name={"amount"}
                      type={"number"}
                      placeholder={"Cash Amount"}
                      value={row.amount}
                      onChange={(e) => handleCashChange(index, e)}
                      disableFuture
                      className={`disabled:cursor-not-allowed disabled:text-gray-400 disabled:border-gray-400`}
                    />

                    <Button
                      onClick={() => handleRemoveCashRow(index)}
                      icon1={<DeleteIcon color="#fff" />}
                      icon2={<DeleteIcon color="#000" />}
                      className={
                        "h-[38px] mt-5.5 border-gray-400 disabled:cursor-not-allowed disabled:text-gray-400 disabled:border-gray-400  disabled:bg-gray-300"
                      }
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-end items-center mt-4 mr-3 gap-4">
                <p className="text-red-500">{cashErrorMsg}</p>

                <Button
                  onClick={handleAddCashRow}
                  label={"Add Cash"}
                  icon1={<CashIcon />}
                  icon2={<CashIcon color="#292D32" />}
                />
              </div>
            </div>
          </div>
          <div>
            <div>
              {gpayData.map((row, index) => (
                <div className="grid grid-cols-3 gap-3 mb-2" key={index}>
                  <div className="flex flex-col col-span-1 relative">
                    <DateUiPicker
                      value={row.date ? dayjs(row.date) : null}
                      onChange={(val) =>
                        handleGpayChange(
                          index,
                          val ? setCurrentTime(val) : null,
                          "date",
                        )
                      }
                      label="Gpay Date"
                      isClearable={true}
                      disableFuture
                      className={`disabled:cursor-not-allowed disabled:text-gray-400 disabled:border-gray-400`}
                    />
                  </div>
                  <div className="flex gap-2 col-span-2 mr-3">
                    <InputField
                      name={"amount"}
                      placeholder={"Gpay Amount"}
                      value={row.amount}
                      onChange={(e) => handleGpayChange(index, e)}
                      className={`disabled:cursor-not-allowed disabled:text-gray-400 disabled:border-gray-400`}
                    />
                    <Button
                      onClick={() => handleRemoveGpayRow(index)}
                      icon1={<DeleteIcon color="#fff" />}
                      icon2={<DeleteIcon color="#000" />}
                      className={
                        "h-[38px] mt-5.5 border-gray-400 disabled:cursor-not-allowed disabled:text-gray-400 disabled:border-gray-400 disabled:bg-gray-300"
                      }
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-end items-center mt-4 gap-4">
                <p className="text-red-500">{gpayErrorMsg}</p>

                <Button
                  onClick={handleAddGpayRow}
                  label={"Add Gpay"}
                  icon1={<GpayIcon />}
                  icon2={<GpayIcon color="#292D32" />}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          {documentId && (
            <>
              <Button
                type="button"
                label="Save as PDF"
                onClick={downloadImage}
                icon1={<SavePdfIcon color="#fff" />}
                icon2={<SavePdfIcon color="#fff" />}
                className="bg-green-600 text-white"
              />

              <Button
                type="button"
                label="Print"
                onClick={handlePrint}
                icon1={<PrinterIcon color="#fff" />}
                icon2={<PrinterIcon color="#fff" />}
                className="bg-[#14B8A6] text-white"
              />
            </>
          )}

          <Button
            type="submit"
            label={loading ? (documentId ? "Updating..." : "Saving...") : (documentId ? "Update" : "Save")}
            icon1={<SaveIcon color="#fff" />}
            icon2={<SaveIcon color="#fff" />}
            disabled={loading}
            className="bg-indigo-600 text-white"
          />
        </div>
      </form>

      <PrintUi
        ref={contentRef}
        billNo={billNo}
        name={customerName}
        date={dayjs(date).format("DD-MM-YYYY")}
        amount={totalAmount}
        advance={receivedAmount}
        balance={balanceAmount}
        sizeData={sizeData}
      />

      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <PrintUipdf
          ref={printRef}
          billNo={billNo}
          name={customerName}
          date={dayjs(date).format("DD-MM-YYYY")}
          amount={totalAmount}
          advance={receivedAmount}
          balance={balanceAmount}
          sizeData={sizeData}
        />
      </div>
    </MainLayout>
  );
};

export default LocalEntry;
