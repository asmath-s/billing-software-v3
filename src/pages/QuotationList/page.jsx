import dayjs from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";

import Button from "../../components/Button/Button";
import InputField from "../../components/InputField/InputField";
import QuotationPrint from "../../components/QuotationPrint/QuotationPrint";
import MainLayout from "../../layouts/MainLayout";

import {
  AddIcon,
  DeleteIcon,
  EditIcon,
  PrinterIcon,
} from "../../components/icons";

import {
  deleteQuotation,
  duplicateQuotation,
  getQuotations,
} from "../../api/quotationStorage";
import { QUOTATIONENTRY } from "../../router/paths";
import { formattedAmount } from "../../utils/FormatAmount";

const QuotationList = () => {
  const navigate = useNavigate();
  const printRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [quotations, setQuotations] = useState([]);
  const [searchText, setSearchText] = useState("");

  // Selected quotation for modal preview or direct print
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null);

  const loadQuotations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getQuotations({
        search: searchText,
      });
      setQuotations(data || []);
    } catch (err) {
      console.error("Failed to load quotations:", err);
      toast.error("Failed to load quotations");
      setQuotations([]);
    } finally {
      setLoading(false);
    }
  }, [searchText]);

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  // Handle Print trigger
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: selectedQuote
      ? `Quotation-${selectedQuote.quotationNo}`
      : "Quotation",
  });

  const triggerDirectPrint = (quote) => {
    setSelectedQuote(quote);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const handleOpenPreview = (quote) => {
    setSelectedQuote(quote);
    setShowPreviewModal(true);
  };

  const handleClone = async (id) => {
    try {
      setLoading(true);
      const cloned = await duplicateQuotation(id);
      toast.success(`Cloned as ${cloned.quotationNo}!`);
      loadQuotations();
    } catch (err) {
      console.error("Clone error:", err);
      toast.error("Failed to duplicate quotation.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteQuotation(deleteId);
      toast.success("Quotation deleted successfully.");
      setDeleteId(null);
      loadQuotations();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete quotation.");
    }
  };

  // Compute Grand Total of a quote
  const calculateTotal = (quote) => {
    const rows = quote.rows || [];
    const subtotal = rows.reduce((sum, r) => {
      const amt =
        parseFloat(r.amount) || parseFloat(r.qty) * parseFloat(r.rate) || 0;
      return sum + amt;
    }, 0);
    const taxAmount = (subtotal * (parseFloat(quote.taxPercent) || 0)) / 100;
    const discount = parseFloat(quote.discountAmount) || 0;
    return Math.round(Math.max(0, subtotal + taxAmount - discount));
  };

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Quotation List
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            label="Create Quotation"
            icon1={<AddIcon color="#fff" />}
            icon2={<AddIcon color="#fff" />}
            className="bg-blue-600 hover:bg-blue-700 text-white border-0"
            onClick={() => navigate(QUOTATIONENTRY)}
          />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-[#E0E1E3] rounded-lg p-4 mb-6 shadow-xs flex flex-wrap justify-between items-center gap-4">
        <div className="w-full sm:w-80">
          <InputField
            placeholder="Search by customer name..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white border border-[#E0E1E3] rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#2A3042] text-white uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-3">Quotation No</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Customer / Client</th>
                <th className="py-3 px-3 text-center">Items</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-3 text-center w-48">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-gray-500 text-xs"
                  >
                    Loading quotations...
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <p className="text-sm font-semibold text-gray-600">
                      No quotations found
                    </p>
                  </td>
                </tr>
              ) : (
                quotations.map((q, idx) => {
                  const total = calculateTotal(q);
                  const itemCount = q.rows?.length || 0;

                  return (
                    <tr
                      key={q.documentId || q.id || idx}
                      className="hover:bg-gray-50/80 transition-colors"
                    >
                      <td className="py-3 px-3 text-center text-xs text-gray-500 font-medium">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3 font-semibold text-blue-700">
                        {q.quotationNo}
                      </td>

                      <td className="py-3 px-3 text-xs text-gray-600">
                        {q.date ? dayjs(q.date).format("DD-MM-YYYY") : "-"}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-gray-900">
                          {q.customerName || "—"}
                        </div>
                        {q.address && (
                          <div className="text-[11px] text-gray-500 truncate max-w-xs">
                            {q.address}
                          </div>
                        )}
                        {q.phone && (
                          <div className="text-[11px] text-gray-400">
                            {q.phone}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center text-xs text-gray-600">
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-gray-900">
                        ₹ {formattedAmount(total)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Preview button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(q)}
                            className="p-1.5 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 rounded font-medium cursor-pointer"
                            title="Preview Document"
                          >
                            👁 View
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `${QUOTATIONENTRY}?editId=${q.documentId || q.id}`,
                              )
                            }
                            className="p-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded cursor-pointer"
                            title="Edit Quotation"
                          >
                            <EditIcon />
                          </button>

                          {/* Direct Print */}
                          <button
                            type="button"
                            onClick={() => triggerDirectPrint(q)}
                            className="p-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded cursor-pointer"
                            title="Print Quotation"
                          >
                            <PrinterIcon />
                          </button>

                          {/* Clone */}
                          <button
                            type="button"
                            onClick={() => handleClone(q.documentId || q.id)}
                            className="p-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded font-medium cursor-pointer"
                            title="Duplicate as New Quote"
                          >
                            ⧉
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteId(q.documentId || q.id)}
                            className="p-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded cursor-pointer"
                            title="Delete Quotation"
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ────────────────── PREVIEW MODAL ────────────────── */}
      {showPreviewModal && selectedQuote && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-100 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-gray-800">
                  Quotation: {selectedQuote.quotationNo}
                </h3>
                <p className="text-xs text-gray-500">
                  Customer: {selectedQuote.customerName || "N/A"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => triggerDirectPrint(selectedQuote)}
                  className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3.5 py-1.5 rounded cursor-pointer"
                >
                  <PrinterIcon /> Print
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-3 py-1.5 rounded cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Body: Rendered Quotation */}
            <div className="p-6 overflow-y-auto bg-gray-200/70 flex justify-center">
              <div className="bg-white shadow-md">
                <QuotationPrint {...selectedQuote} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── DELETE CONFIRMATION MODAL ────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-800">
              Delete Quotation?
            </h3>
            <p className="text-xs text-gray-600">
              Are you sure you want to delete this quotation? This action cannot
              be undone.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Container */}
      <div className="hidden">
        {selectedQuote && <QuotationPrint ref={printRef} {...selectedQuote} />}
      </div>
    </MainLayout>
  );
};

export default QuotationList;
