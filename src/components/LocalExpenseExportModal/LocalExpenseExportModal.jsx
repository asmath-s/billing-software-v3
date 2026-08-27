import { useCallback, useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";
import dayjs from "../../utils/dayjs";
import { fetchAllLocalExpensesForExport } from "../../api/localExpense";
import Button from "../Button/Button";
import InputField from "../InputField/InputField";
import { DateUiPicker } from "../Datepicker/Datepicker";
import { PrinterIcon, SavePdfIcon } from "../icons";
import LocalExpensePrintDoc from "./LocalExpensePrintDoc";

const LocalExpenseExportModal = ({
  open,
  onClose,
  sectionTitle = "Local Expense – Approved",
  status = "approved",
}) => {
  const printRef = useRef(null);

  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  const [printData, setPrintData] = useState(null);
  const [triggerPrintNow, setTriggerPrintNow] = useState(false);

  const handleResetAndClose = useCallback(() => {
    if (loading) return;
    setFromDate(null);
    setToDate(null);
    setInstruction("");
    setLoading(false);
    setLoadingMsg("");
    onClose();
  }, [loading, onClose]);

  // Print hook
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${sectionTitle.replace(/[^\w\d-_]/g, "_")}_${dayjs().format("YYYYMMDD_HHmm")}`,
    onAfterPrint: () => {
      setTriggerPrintNow(false);
    },
  });

  // Watch for printData update to trigger print
  useEffect(() => {
    if (triggerPrintNow && printData && printRef.current) {
      handlePrint();
      setTriggerPrintNow(false);
      setLoading(false);
      handleResetAndClose();
    }
  }, [triggerPrintNow, printData, handlePrint, handleResetAndClose]);

  const handleExport = async (e) => {
    if (e) e.preventDefault();

    // ── Date Validation: Must select both or none ──
    if ((fromDate && !toDate) || (!fromDate && toDate)) {
      toast.error("Please select both From Date and To Date.");
      return;
    }

    if (fromDate && toDate && dayjs(fromDate).isAfter(dayjs(toDate), "day")) {
      toast.error("From Date cannot be after To Date.");
      return;
    }

    setLoading(true);
    setLoadingMsg("Fetching expense data and generating PDF...");

    try {
      const records = await fetchAllLocalExpensesForExport({
        status,
        fromDate,
        toDate,
        instruction,
      });

      if (!records || records.length === 0) {
        toast.error("No expense records found for the selected filters.");
        setLoading(false);
        setLoadingMsg("");
        return;
      }

      // Populate print data
      setPrintData({
        title: sectionTitle,
        status,
        fromDate,
        toDate,
        instruction,
        records,
        generatedAt: new Date(),
      });

      toast.success(`Found ${records.length} records. Preparing PDF print...`);
      setTriggerPrintNow(true);
    } catch (error) {
      console.error("Export Local Expense failed:", error);
      toast.error("Failed to fetch expense records. Please try again.");
      setLoading(false);
      setLoadingMsg("");
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-visible border border-gray-100 flex flex-col relative my-auto">
          {/* ── Modal Header ── */}
          <div className="px-6 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="text-base font-bold tracking-tight">Export PDF Report</h3>
              <p className="text-xs text-gray-300 mt-0.5">{sectionTitle}</p>
            </div>

            <button
              type="button"
              onClick={handleResetAndClose}
              disabled={loading}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded-md cursor-pointer disabled:opacity-50"
              title="Close Modal"
            >
              ✕
            </button>
          </div>

          {/* ── Modal Form ── */}
          <form onSubmit={handleExport} className="p-6 space-y-4">
            <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
              <span className="font-semibold block mb-0.5">ℹ️ Filter Instructions:</span>
              Leave all fields empty to export <strong>all records</strong>, or specify a date range and instruction keyword.
            </div>

            {/* Date Range Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <DateUiPicker
                  label="From Date (Optional)"
                  value={fromDate}
                  onChange={setFromDate}
                  placeholder="DD-MM-YYYY"
                  disabled={loading}
                  isClearable
                />
              </div>

              <div>
                <DateUiPicker
                  label="To Date (Optional)"
                  value={toDate}
                  onChange={setToDate}
                  placeholder="DD-MM-YYYY"
                  disabled={loading}
                  isClearable
                />
              </div>
            </div>

            {/* Instruction Filter Field */}
            <div>
              <InputField
                label="Instruction Filter (Optional)"
                placeholder="Search specific instruction / note..."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Loading Indicator Message */}
            {loading && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg text-xs animate-pulse">
                <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium">{loadingMsg || "Processing export..."}</span>
              </div>
            )}

            {/* ── Action Buttons ── */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <Button
                type="button"
                label="Cancel"
                disabled={loading}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-xs px-4"
                onClick={handleResetAndClose}
              />

              <Button
                type="submit"
                label={loading ? "Exporting..." : "Export PDF"}
                icon1={<SavePdfIcon color="#fff" />}
                icon2={<PrinterIcon color="#fff" />}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 text-xs px-5 font-semibold"
              />
            </div>
          </form>
        </div>
      </div>

      {/* ── Hidden Print Document Container ── */}
      <div style={{ display: "none" }}>
        {printData && <LocalExpensePrintDoc ref={printRef} {...printData} />}
      </div>
    </>
  );
};

export default LocalExpenseExportModal;
