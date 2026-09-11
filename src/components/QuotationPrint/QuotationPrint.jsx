import dayjs from "dayjs";
import { forwardRef } from "react";
import Logo from "../../assets/logo2.jpg";
import { formattedAmount } from "../../utils/FormatAmount";
import { LocationIcon, MailIcon, PhoneIcon } from "../icons";

const QuotationPrint = forwardRef((props, ref) => {
  const {
    quotationNo = "",
    date = new Date(),
    customerName = "",
    address = "",
    phone = "",
    topText = "",
    columns = [],
    rows = [],
    taxPercent = 0,
    discountAmount = 0,
    bottomText = "",
    signatoryCompany = "RAYYAN FLEX",
    signatoryTitle = "Authorized Signatory",
    printMode = false,
  } = props;

  // Determine if Amount column exists in columns definition
  const hasAmountColumn = columns.some(
    (col) =>
      col.key === "amount" ||
      col.type === "amount" ||
      col.id === "col_amount" ||
      col.label?.toLowerCase()?.includes("amount"),
  );

  // Check if any row has an amount entered
  const hasAnyRowAmount = rows.some((r) => {
    const amt = parseFloat(r.amount);
    const calculated = parseFloat(r.qty) * parseFloat(r.rate);
    return (!isNaN(amt) && amt > 0) || (!isNaN(calculated) && calculated > 0);
  });

  // Calculate totals only when Amount column is present
  const subtotal = hasAmountColumn
    ? rows.reduce((sum, r) => {
        const amt =
          parseFloat(r.amount) || parseFloat(r.qty) * parseFloat(r.rate) || 0;
        return sum + amt;
      }, 0)
    : 0;

  const taxAmount = (subtotal * (parseFloat(taxPercent) || 0)) / 100;
  const discount = parseFloat(discountAmount) || 0;
  const grandTotal = Math.max(0, subtotal + taxAmount - discount);
  const roundedGrandTotal = Math.round(grandTotal);
  const roundOff = roundedGrandTotal - grandTotal;

  // Show financial summary only if amount column exists and has values
  const showFinancialSummary =
    hasAmountColumn && hasAnyRowAmount && roundedGrandTotal > 0;

  return (
    <div
      ref={ref}
      className="quotation-print-container w-[210mm] min-h-[297mm] p-[10mm] bg-white text-gray-900 font-sans text-[12px] leading-normal mx-auto shadow-sm print:shadow-none print:m-0 print:p-0 print:w-full print:min-h-0 print:h-auto"
      style={{ boxSizing: "border-box" }}
    >
      <style>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .quotation-print-container {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .avoid-break, tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .quotation-header {
            display: none !important;
          }
          .quotation-header-space {
            display: block !important;
            height: 190px !important;
          }
          thead {
            display: table-header-group;
          }
        }
      `}</style>

      {/* ────────────────── 1. HEADER (HIDDEN WHILE PRINT) ────────────────── */}
      {!printMode && (
        <div className="quotation-header flex justify-between items-center border-b-2 border-[#2A3042] pb-3 mb-4 print:hidden">
          <div className="flex items-center gap-3">
            <img
              src={Logo}
              alt="Rayyan Flex"
              className="h-20 w-auto object-contain"
            />
          </div>

          <div className="text-right space-y-1.5">
            <div className="flex items-center justify-end gap-1.5 text-[12px] font-medium text-gray-700">
              <PhoneIcon width={14} height={14} />
              <span>+91 63823 81389 / +91 63809 74082</span>
            </div>
            <div className="flex items-center justify-end gap-1.5 text-[12px] font-medium text-gray-700">
              <MailIcon width={14} height={14} />
              <span>rayyanflex@gmail.com</span>
            </div>
            <div className="flex items-start justify-end gap-1.5 text-[12px] font-medium text-gray-700 text-right">
              <LocationIcon
                className="mt-0.5 shrink-0"
                width={14}
                height={14}
                color="#374151"
              />
              <div className="leading-tight">
                <div>62/74, Police Station Road, Sivakasi</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── LETTERHEAD TOP SPACE (MATCHING GST SALES PRINT: 190px) ────────────────── */}
      {printMode ? (
        <div
          className="quotation-header-space w-full flex items-center justify-center mb-3"
          style={{ height: "190px" }}
        >
          {/* Visual indicator in screen preview; completely hidden during actual print */}
          <div className="print:hidden w-full h-full border border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400 select-none">
            [ Pre-printed Letterhead Space — 190px (Empty during Print) ]
          </div>
        </div>
      ) : (
        <div
          className="quotation-header-space hidden print:block"
          style={{ height: "190px" }}
          aria-hidden="true"
        />
      )}

      {/* ────────────────── 2. TITLE BADGE ────────────────── */}
      <div className="text-center my-3 print:my-2">
        <span className="inline-block bg-[#2A3042] text-white text-[12px] font-bold tracking-widest px-8 py-1 uppercase rounded-xs">
          QUOTATION
        </span>
      </div>

      {/* ────────────────── 3. META & CUSTOMER DETAILS ────────────────── */}
      <div className="grid grid-cols-2 gap-4 border border-gray-300 rounded-xs p-3.5 mb-4 bg-gray-50/50 print:mb-3 print:p-2.5">
        {/* Customer Info (Font sizes preserved) */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Quotation For:
          </div>
          <div className="text-[15px] font-bold text-gray-900">
            {customerName || "Valued Customer"}
          </div>
          {address && (
            <div className="text-[14px] text-gray-700 whitespace-pre-wrap">
              <span className="font-semibold">Address:</span> {address}
            </div>
          )}
          {phone && (
            <div className="text-[14px] text-gray-700">
              <span className="font-semibold">Phone:</span> {phone}
            </div>
          )}
        </div>

        {/* Quotation Info (Quote No removed) */}
        <div className="space-y-1.5 text-right flex flex-col justify-start">
          <div className="flex justify-end gap-2 text-[14px]">
            <span className="font-semibold text-gray-600">Date:</span>
            <span>{dayjs(date).format("DD-MM-YYYY")}</span>
          </div>
        </div>
      </div>

      {/* ────────────────── 4. TOP RICH TEXT EDITOR CONTENT ────────────────── */}
      {topText && (
        <div
          className="mb-4 print:mb-3 text-[14px] leading-relaxed text-gray-800 whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: topText }}
        />
      )}

      {/* ────────────────── 5. DYNAMIC QUOTATION TABLE ────────────────── */}
      <div className="mb-4 print:mb-3">
        <table className="w-full border-collapse border border-gray-400 text-[14px]">
          <thead>
            <tr className="bg-[#2A3042] text-white">
              <th className="border border-gray-400 py-2 px-2 text-center w-8 font-semibold">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  style={{ width: col.width }}
                  className={`border border-gray-400 py-2 px-2.5 font-semibold text-${col.align}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr
                key={row.id || rIdx}
                className={`avoid-break ${rIdx % 2 === 1 ? "bg-gray-50/70" : "bg-white"}`}
              >
                <td className="border border-gray-300 py-2 px-2 text-center align-top text-gray-600 font-medium">
                  {rIdx + 1}
                </td>
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={`border border-gray-300 py-2 px-2.5 align-top text-${col.align} whitespace-pre-wrap`}
                  >
                    {col.key === "amount" ? (
                      <span className="font-medium">
                        {(parseFloat(row[col.key]) || 0) > 0 ||
                        ((parseFloat(row.qty) || 0) > 0 &&
                          (parseFloat(row.rate) || 0) > 0)
                          ? `₹ ${formattedAmount(
                              parseFloat(row[col.key]) ||
                                parseFloat(row.qty) * parseFloat(row.rate) ||
                                0,
                            )}`
                          : "-"}
                      </span>
                    ) : col.key === "rate" ? (
                      <span>
                        {row[col.key]
                          ? `₹ ${formattedAmount(row[col.key])}`
                          : "-"}
                      </span>
                    ) : (
                      row[col.key] || "-"
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Financial Summary (Only shown when Amount is present) */}
        {showFinancialSummary && (
          <div className="avoid-break flex justify-end items-start border-x border-b border-gray-400 p-3 bg-gray-50 text-[14px] print:p-2.5">
            <div className="w-[45%] sm:w-[35%] space-y-1.5 text-[14px]">
              <div className="flex justify-between text-gray-600">
                <span className="font-medium">Sub Total:</span>
                <span className="font-semibold text-gray-900">
                  ₹ {formattedAmount(subtotal.toFixed(2))}
                </span>
              </div>

              {taxPercent > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>GST / Tax ({taxPercent}%):</span>
                  <span className="font-semibold text-gray-900">
                    ₹ {formattedAmount(taxAmount.toFixed(2))}
                  </span>
                </div>
              )}

              {discount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount:</span>
                  <span className="font-semibold">
                    - ₹ {formattedAmount(discount.toFixed(2))}
                  </span>
                </div>
              )}

              {Math.abs(roundOff) > 0.001 && (
                <div className="flex justify-between text-gray-500 text-[12px]">
                  <span>Round Off:</span>
                  <span>
                    {roundOff >= 0
                      ? `+ ₹${roundOff.toFixed(2)}`
                      : `- ₹${Math.abs(roundOff).toFixed(2)}`}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-[12px] font-bold text-[#2A3042] border-t border-gray-300 pt-1.5">
                <span>Grand Total:</span>
                <span>₹ {formattedAmount(roundedGrandTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────── 6. BOTTOM RICH TEXT EDITOR CONTENT ────────────────── */}
      {bottomText && (
        <div className="avoid-break my-4 print:my-2 p-3 print:p-2 border border-gray-200 rounded-xs bg-gray-50/40">
          <div
            className="text-[12px] leading-relaxed text-gray-800 whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={{ __html: bottomText }}
          />
        </div>
      )}

      {/* ────────────────── 7. SIGNATURE SECTION (RIGHT ALIGNED) ────────────────── */}
      <div className="mt-8 pt-4 print:mt-4 print:pt-2 flex justify-end items-end avoid-break">
        <div className="text-right space-y-10 print:space-y-6 min-w-[220px]">
          <p className="text-[12px] font-bold text-gray-800">
            For {signatoryCompany || "RAYYAN FLEX"}
          </p>

          <div className="border-t border-gray-400 pt-1.5">
            <p className="text-[12px] font-semibold text-gray-700">
              {signatoryTitle || "Authorized Signatory"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

QuotationPrint.displayName = "QuotationPrint";

export default QuotationPrint;
