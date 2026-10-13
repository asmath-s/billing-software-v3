import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";
import dayjs from "../../utils/dayjs";
import { ClearIcon, PrinterIcon, SavePdfIcon } from "../icons";
import CustomerPrintDoc from "./CustomerPrintDoc";

// CSV helper with UTF-8 BOM for Excel compatibility
const exportCsvFile = (filename, headers, rows) => {
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const CustomerExportModal = ({
  open,
  onClose,
  title = "Local Customers Directory",
  filePrefix = "Local_Customers",
  isGst = false,
  allCustomers = [],
  filteredCustomers = [],
  searchText = "",
}) => {
  const printRef = useRef(null);

  const [exportScope, setExportScope] = useState("all");
  const [isPrinting, setIsPrinting] = useState(false);

  const hasSearch = Boolean(searchText.trim());

  // Determine active dataset to export
  const selectedRecords =
    hasSearch && exportScope === "filtered"
      ? filteredCustomers
      : allCustomers;

  // React To Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${filePrefix}_${dayjs().format("YYYYMMDD_HHmm")}`,
    onAfterPrint: () => {
      setIsPrinting(false);
    },
  });

  const handlePrintTrigger = () => {
    if (selectedRecords.length === 0) {
      toast.warning("No records to export.");
      return;
    }
    setIsPrinting(true);
    handlePrint();
  };

  // CSV Export handler
  const handleCsvExport = () => {
    if (selectedRecords.length === 0) {
      toast.warning("No records to export.");
      return;
    }

    const timestamp = dayjs().format("YYYYMMDD_HHmm");
    const filename = `${filePrefix}_${timestamp}.csv`;

    let headers = [];
    let rows = [];

    if (isGst) {
      headers = [
        "S.No",
        "Customer Name",
        "GSTIN",
        "Billing Address",
        "Delivery Address",
        "Created Date",
      ];
      rows = selectedRecords.map((c, i) => [
        i + 1,
        c.name || "",
        c.gst_no || c.gstno || "",
        c.address || "",
        c.delivery_address || "",
        c.createdAt ? dayjs(c.createdAt).format("DD-MM-YYYY") : "",
      ]);
    } else {
      headers = ["S.No", "Customer Name", "Phone Number", "Created Date"];
      rows = selectedRecords.map((c, i) => [
        i + 1,
        c.name || "",
        c.phonenumber || "",
        c.createdAt ? dayjs(c.createdAt).format("DD-MM-YYYY") : "",
      ]);
    }

    exportCsvFile(filename, headers, rows);
    toast.success(`Exported ${selectedRecords.length} records to Excel (CSV)`);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 flex flex-col relative my-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Modal Header ── */}
          <div className="px-6 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold tracking-tight">
                Export Customers
              </h3>
              <p className="text-xs text-gray-300 mt-0.5">{title}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded-md cursor-pointer"
              title="Close Modal"
            >
              <ClearIcon color="#fff" width="16" height="16" />
            </button>
          </div>

          {/* ── Modal Body ── */}
          <div className="p-6 space-y-5">
            {/* ── Scope Selection ── */}
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-2">
                Select Records to Export
              </label>

              <div className="space-y-2">
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    exportScope === "all"
                      ? "border-[#4F46E5] bg-indigo-50/40 text-indigo-950 font-medium"
                      : "border-gray-200 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="exportScope"
                    value="all"
                    checked={exportScope === "all"}
                    onChange={() => setExportScope("all")}
                    className="accent-[#4F46E5] w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 flex justify-between items-center">
                    <span>All Customers</span>
                    <span className="text-xs font-bold px-2 py-0.5 bg-gray-200 text-gray-800 rounded-full">
                      {allCustomers.length}
                    </span>
                  </div>
                </label>

                {hasSearch && (
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      exportScope === "filtered"
                        ? "border-[#4F46E5] bg-indigo-50/40 text-indigo-950 font-medium"
                        : "border-gray-200 hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportScope"
                      value="filtered"
                      checked={exportScope === "filtered"}
                      onChange={() => setExportScope("filtered")}
                      className="accent-[#4F46E5] w-4 h-4 cursor-pointer"
                    />
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <span>Current Filtered List</span>
                        <p className="text-[11px] text-gray-500 font-normal">
                          Matches &quot;{searchText}&quot;
                        </p>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                        {filteredCustomers.length}
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* ── Summary Card ── */}
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 flex justify-between items-center border border-gray-100">
              <span>Ready to Export:</span>
              <span className="font-bold text-gray-900 text-sm">
                {selectedRecords.length} Customers
              </span>
            </div>

            {/* ── Action Buttons ── */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleCsvExport}
                disabled={selectedRecords.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <SavePdfIcon color="#fff" width="16" height="16" />
                Download Excel (CSV)
              </button>

              <button
                type="button"
                onClick={handlePrintTrigger}
                disabled={selectedRecords.length === 0 || isPrinting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-sm transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <PrinterIcon color="#fff" width="16" height="16" />
                {isPrinting ? "Preparing PDF..." : "Print / Save PDF Report"}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-center text-xs text-gray-500 hover:text-gray-800 font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hidden Print Document ── */}
      <div className="hidden">
        <CustomerPrintDoc
          ref={printRef}
          title={title}
          isGst={isGst}
          records={selectedRecords}
          searchText={hasSearch && exportScope === "filtered" ? searchText : ""}
          generatedAt={new Date()}
        />
      </div>
    </>
  );
};

export default CustomerExportModal;
