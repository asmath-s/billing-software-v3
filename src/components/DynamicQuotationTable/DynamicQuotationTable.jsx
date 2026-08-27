import { useState } from "react";
import { formattedAmount } from "../../utils/FormatAmount";

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

const createInitialQuotationRow = (index = 1) => ({
  id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  sno: String(index),
  description: "",
  qty: "",
  rate: "",
  amount: "",
});

const DynamicQuotationTable = ({
  columns = DEFAULT_COLUMNS,
  onColumnsChange,
  rows = [],
  onRowsChange,
  taxPercent = 0,
  onTaxPercentChange,
  discountAmount = 0,
  onDiscountAmountChange,
}) => {
  const [newColName, setNewColName] = useState("");
  const [showAddColModal, setShowAddColModal] = useState(false);
  const [editingColId, setEditingColId] = useState(null);
  const [editingColLabel, setEditingColLabel] = useState("");

  // Handle cell value change
  const handleCellChange = (rowIndex, colKey, val) => {
    const updatedRows = [...rows];
    const currentRow = { ...updatedRows[rowIndex], [colKey]: val };

    // Auto calculate amount if qty or rate changes
    if (colKey === "qty" || colKey === "rate") {
      const q = parseFloat(colKey === "qty" ? val : currentRow.qty) || 0;
      const r = parseFloat(colKey === "rate" ? val : currentRow.rate) || 0;
      if (q && r) {
        currentRow.amount = (q * r).toFixed(2);
      }
    }

    updatedRows[rowIndex] = currentRow;
    onRowsChange(updatedRows);
  };

  // Add new row
  const handleAddRow = () => {
    const nextSno = rows.length + 1;
    const newRow = createInitialQuotationRow(nextSno);
    onRowsChange([...rows, newRow]);
  };

  // Delete row
  const handleDeleteRow = (index) => {
    if (rows.length === 1) {
      // Keep at least one row, just clear it
      onRowsChange([createInitialQuotationRow(1)]);
      return;
    }
    const filtered = rows
      .filter((_, i) => i !== index)
      .map((r, i) => ({
        ...r,
        sno: String(i + 1),
      }));
    onRowsChange(filtered);
  };

  // Move row up / down
  const handleMoveRow = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= rows.length) return;
    const updated = [...rows];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    // re-index sno
    const reindexed = updated.map((r, i) => ({ ...r, sno: String(i + 1) }));
    onRowsChange(reindexed);
  };

  // Add custom column
  const handleAddColumn = (e) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    const key =
      newColName.toLowerCase().replace(/[^a-z0-9]/g, "_") ||
      `col_${Date.now()}`;
    const newCol = {
      id: `col_${Date.now()}`,
      label: newColName.trim(),
      key,
      align: "left",
      width: "15%",
      type: "text",
    };

    onColumnsChange([...columns, newCol]);
    setNewColName("");
    setShowAddColModal(false);
  };

  // Delete custom column
  const handleDeleteColumn = (colId) => {
    if (columns.length <= 2) {
      alert("At least 2 columns must be kept in the table.");
      return;
    }
    const filteredCols = columns.filter((c) => c.id !== colId);
    onColumnsChange(filteredCols);
  };

  // Rename column header
  const handleStartEditCol = (col) => {
    setEditingColId(col.id);
    setEditingColLabel(col.label);
  };

  const handleSaveColName = (colId) => {
    if (!editingColLabel.trim()) {
      setEditingColId(null);
      return;
    }
    const updated = columns.map((c) =>
      c.id === colId ? { ...c, label: editingColLabel.trim() } : c,
    );
    onColumnsChange(updated);
    setEditingColId(null);
  };

  // Calculate totals
  const subtotal = rows.reduce((sum, r) => {
    const amt =
      parseFloat(r.amount) || parseFloat(r.qty) * parseFloat(r.rate) || 0;
    return sum + amt;
  }, 0);

  const taxAmount = (subtotal * (parseFloat(taxPercent) || 0)) / 100;
  const discount = parseFloat(discountAmount) || 0;
  const grandTotal = Math.max(0, subtotal + taxAmount - discount);
  const roundedGrandTotal = Math.round(grandTotal);
  const roundOff = roundedGrandTotal - grandTotal;

  return (
    <div className="border border-[#E0E1E3] rounded-lg bg-white overflow-hidden shadow-xs">
      {/* Top action bar */}
      <div className="p-3 bg-gray-50 border-b border-[#E0E1E3] flex flex-wrap justify-between items-center gap-2">
        <div className="flex w-full justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowAddColModal(true)}
            className="flex items-center gap-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded cursor-pointer transition-colors"
          >
            + Add Column
          </button>
        </div>
      </div>

      {/* Add Column Modal / Bar */}
      {showAddColModal && (
        <div className="p-3 bg-blue-50 border-b border-blue-200 flex items-center gap-3">
          <span className="text-xs font-semibold text-blue-900">
            New Column Name:
          </span>
          <input
            type="text"
            placeholder="e.g., Unit, HSN Code, Dimensions, Remark"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            className="text-xs border border-blue-300 rounded px-2.5 py-1 bg-white focus:outline-blue-500 w-64"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddColumn}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded cursor-pointer"
          >
            Save Column
          </button>
          <button
            type="button"
            onClick={() => setShowAddColModal(false)}
            className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#2A3042] text-white select-none">
              <th className="py-2.5 px-2 text-center text-xs font-semibold w-10 border-r border-[#3d455d]">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  style={{ width: col.width }}
                  className={`py-2.5 px-3 text-xs font-semibold uppercase tracking-wider border-r border-[#3d455d] text-${col.align} group relative`}
                >
                  <div className="flex items-center justify-between gap-1">
                    {editingColId === col.id ? (
                      <input
                        type="text"
                        value={editingColLabel}
                        onChange={(e) => setEditingColLabel(e.target.value)}
                        onBlur={() => handleSaveColName(col.id)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSaveColName(col.id)
                        }
                        autoFocus
                        className="text-xs text-gray-900 bg-white px-1.5 py-0.5 rounded w-full focus:outline-hidden"
                      />
                    ) : (
                      <span
                        onClick={() => handleStartEditCol(col)}
                        title="Click to rename column header"
                        className="cursor-pointer hover:underline truncate"
                      >
                        {col.label}
                      </span>
                    )}

                    {columns.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteColumn(col.id)}
                        title="Delete column"
                        className="text-gray-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="py-2.5 px-2 text-center text-xs font-semibold w-24">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {rows.map((row, rIdx) => (
              <tr
                key={row.id || rIdx}
                className="hover:bg-blue-50/40 transition-colors"
              >
                {/* Row Number */}
                <td className="py-2 px-2 text-center text-xs font-medium text-gray-500 bg-gray-50/60 border-r border-gray-200">
                  {rIdx + 1}
                </td>

                {/* Dynamic cells */}
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className="p-1 border-r border-gray-200 align-top"
                  >
                    {col.type === "multiline" ? (
                      <textarea
                        rows={2}
                        value={row[col.key] || ""}
                        placeholder="Enter description, specs, dimensions..."
                        onChange={(e) =>
                          handleCellChange(rIdx, col.key, e.target.value)
                        }
                        className="w-full text-xs p-1.5 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded bg-transparent focus:bg-white focus:outline-hidden transition-colors resize-y"
                      />
                    ) : (
                      <input
                        type={
                          col.type === "number" || col.type === "amount"
                            ? "number"
                            : "text"
                        }
                        step={
                          col.type === "number" || col.type === "amount"
                            ? "any"
                            : undefined
                        }
                        value={row[col.key] ?? ""}
                        placeholder={col.type === "number" ? "0" : ""}
                        onChange={(e) =>
                          handleCellChange(rIdx, col.key, e.target.value)
                        }
                        className={`w-full text-xs p-1.5 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded bg-transparent focus:bg-white focus:outline-hidden transition-colors text-${col.align}`}
                      />
                    )}
                  </td>
                ))}

                {/* Actions */}
                <td className="py-2 px-2 text-center border-gray-200">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      disabled={rIdx === 0}
                      onClick={() => handleMoveRow(rIdx, -1)}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={rIdx === rows.length - 1}
                      onClick={() => handleMoveRow(rIdx, 1)}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(rIdx)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                      title="Delete Row"
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer / Financial Calculation Summary */}
      <div className="p-4 bg-gray-50 border-t border-[#E0E1E3] flex flex-wrap justify-between items-start gap-4">
        <button
          type="button"
          onClick={handleAddRow}
          className="text-sm bg-blue-600 border border-gray-300 hover:border-blue-500 hover:text-blue-600 text-white px-3 py-1.5 rounded shadow-2xs font-medium cursor-pointer transition-colors"
        >
          + Add Row
        </button>

        {/* Calculation Box */}
        <div className="w-full sm:w-80 space-y-2 text-xs">
          <div className="flex justify-between items-center text-gray-600">
            <span className="font-medium">Sub Total:</span>
            <span className="font-semibold text-gray-800">
              ₹ {formattedAmount(subtotal.toFixed(2))}
            </span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <div className="flex items-center gap-1.5">
              <span>GST / Tax:</span>
              <select
                value={taxPercent}
                onChange={(e) => onTaxPercentChange(Number(e.target.value))}
                className="text-xs border border-gray-300 rounded px-1.5 py-0.5 bg-white"
              >
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>
            <span className="font-semibold text-gray-800">
              ₹ {formattedAmount(taxAmount.toFixed(2))}
            </span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <div className="flex items-center gap-1.5">
              <span>Discount (₹):</span>
              <input
                type="number"
                min="0"
                value={discountAmount || ""}
                placeholder="0"
                onChange={(e) =>
                  onDiscountAmountChange(Number(e.target.value) || 0)
                }
                className="text-xs border border-gray-300 rounded px-1.5 py-0.5 w-20 bg-white"
              ></input>
            </div>
            <span className="font-semibold text-green-600">
              - ₹ {formattedAmount(discount.toFixed(2))}
            </span>
          </div>

          {Math.abs(roundOff) > 0.001 && (
            <div className="flex justify-between items-center text-gray-500 text-[11px]">
              <span>Round Off:</span>
              <span>
                {roundOff >= 0
                  ? `+ ₹${roundOff.toFixed(2)}`
                  : `- ₹${Math.abs(roundOff).toFixed(2)}`}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center text-sm font-bold text-gray-900 border-t border-gray-300 pt-2">
            <span>Grand Total:</span>
            <span className="text-blue-700 text-base">
              ₹ {formattedAmount(roundedGrandTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicQuotationTable;
