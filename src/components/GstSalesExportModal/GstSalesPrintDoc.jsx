import { forwardRef } from "react";
import dayjs from "../../utils/dayjs";
import { formattedAmount } from "../../utils/FormatAmount";
import Logo from "../../assets/rayyanflexlogo.png";

const GstSalesPrintDoc = forwardRef((props, ref) => {
  const {
    title = "GST Sales Report",
    selectedCustomer = null,
    fromDate = null,
    toDate = null,
    records = [],
    generatedAt = new Date(),
  } = props;

  const totalDebit = (records || []).reduce(
    (sum, item) => sum + (Number(item?.total_amount) || 0),
    0,
  );

  const totalCredit = (records || []).reduce(
    (sum, item) => sum + (Number(item?.received_amount) || 0),
    0,
  );

  const balance = totalDebit - totalCredit;

  const hasDateFilter = Boolean(fromDate && toDate);
  const hasCustomerFilter = Boolean(selectedCustomer?.label || selectedCustomer?.name);
  const customerName = selectedCustomer?.label || selectedCustomer?.name || "";

  return (
    <div ref={ref} className="p-8 bg-white text-gray-900 font-sans print-document">
      {/* ── STYLES FOR PRINT / A4 OUTPUT ── */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 12mm 12mm;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-document {
            padding: 0 !important;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>

      {/* ── HEADER SECTION ── */}
      <div className="border-b-2 border-gray-800 pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="Rayyan Flex" className="h-12 w-auto object-contain" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 uppercase">
                RAYYAN GRAPHICS / FLEX
              </h1>
              <p className="text-xs text-gray-600">
                62/74, Police Station Road, Sivakasi | Phone: +91 63809 74082
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block bg-gray-900 text-white font-bold text-xs uppercase px-3 py-1 rounded">
              {title}
            </span>
            <p className="text-[11px] text-gray-500 mt-1">
              Generated on: {dayjs(generatedAt).format("DD-MM-YYYY hh:mm A")}
            </p>
          </div>
        </div>
      </div>

      {/* ── APPLIED FILTERS INFO BOX ── */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <span className="text-gray-500 font-medium block">Customer Filter:</span>
          <span className="font-semibold text-gray-800">
            {hasCustomerFilter ? customerName : "All Customers (No Filter)"}
          </span>
        </div>

        <div>
          <span className="text-gray-500 font-medium block">Date Range:</span>
          <span className="font-semibold text-gray-800">
            {hasDateFilter
              ? `${dayjs(fromDate).format("DD/MM/YYYY")} to ${dayjs(toDate).format("DD/MM/YYYY")}`
              : "All Dates (No Filter)"}
          </span>
        </div>

        <div>
          <span className="text-gray-500 font-medium block">Total Entries:</span>
          <span className="font-semibold text-gray-800">{records.length} records</span>
        </div>
      </div>

      {/* ── GST SALES DATA TABLE (STRICTLY 5 COLUMNS) ── */}
      <div className="mb-6">
        <table className="w-full border-collapse border border-gray-300 text-xs">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="border border-gray-300 py-2 px-2 text-center w-24">Date</th>
              <th className="border border-gray-300 py-2 px-2 text-center w-28">Bill No</th>
              <th className="border border-gray-300 py-2 px-3 text-left">Name</th>
              <th className="border border-gray-300 py-2 px-3 text-right w-32">Debit (₹)</th>
              <th className="border border-gray-300 py-2 px-3 text-right w-32">Credit (₹)</th>
            </tr>
          </thead>

          <tbody>
            {records.map((item, index) => {
              const debitVal = Number(item.total_amount) || 0;
              const creditVal = Number(item.received_amount) || 0;

              return (
                <tr
                  key={item.documentId || item.id || index}
                  className={`page-break-inside-avoid ${index % 2 === 1 ? "bg-gray-50/70" : "bg-white"}`}
                >
                  <td className="border border-gray-300 py-1.5 px-2 text-center text-gray-800 font-medium whitespace-nowrap">
                    {item.date ? dayjs(item.date).format("DD/MM/YYYY") : "-"}
                  </td>
                  <td className="border border-gray-300 py-1.5 px-2 text-center text-gray-800 font-semibold">
                    {item.bill_no || "-"}
                  </td>
                  <td className="border border-gray-300 py-1.5 px-3 text-gray-900 font-normal break-words">
                    {item.gst_customer?.name || "-"}
                  </td>
                  <td className="border border-gray-300 py-1.5 px-3 text-right font-medium text-gray-900">
                    {debitVal > 0 ? formattedAmount(debitVal) : "-"}
                  </td>
                  <td className="border border-gray-300 py-1.5 px-3 text-right font-medium text-gray-900">
                    {creditVal > 0 ? formattedAmount(creditVal) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-800 page-break-inside-avoid">
              <td colSpan={3} className="border border-gray-300 py-2 px-3 text-right uppercase text-xs">
                Totals ({records.length} records):
              </td>
              <td className="border border-gray-300 py-2 px-3 text-right text-xs font-bold text-gray-900">
                ₹ {formattedAmount(totalDebit)}
              </td>
              <td className="border border-gray-300 py-2 px-3 text-right text-xs font-bold text-gray-900">
                ₹ {formattedAmount(totalCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── TOTALS & BALANCE SUMMARY BOX ── */}
      <div className="flex justify-end mb-8 page-break-inside-avoid">
        <div className="w-80 border border-gray-300 rounded-md overflow-hidden text-xs bg-gray-50/50">
          <div className="flex justify-between py-1.5 px-3 border-b border-gray-200">
            <span className="font-semibold text-gray-600 uppercase">Total Debit:</span>
            <span className="font-bold text-gray-900">₹ {formattedAmount(totalDebit)}</span>
          </div>

          <div className="flex justify-between py-1.5 px-3 border-b border-gray-200">
            <span className="font-semibold text-gray-600 uppercase">Total Credit:</span>
            <span className="font-bold text-gray-900">₹ {formattedAmount(totalCredit)}</span>
          </div>

          <div className="flex justify-between py-2 px-3 bg-gray-100 text-sm font-extrabold border-t border-gray-300">
            <span className="uppercase text-gray-900">Balance:</span>
            <span className={balance >= 0 ? "text-indigo-900" : "text-red-600"}>
              ₹ {formattedAmount(balance)}
            </span>
          </div>
        </div>
      </div>

      {/* ── FOOTER & SIGNATORY SECTION ── */}
      <div className="pt-4 border-t border-gray-300 flex justify-between items-end text-xs text-gray-600 page-break-inside-avoid">
        <div>
          <p className="italic">* Computer-generated accounting statement.</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Printed from Rayyan Flex ERP System</p>
        </div>

        <div className="text-right">
          <p className="font-semibold text-gray-800 uppercase">For RAYYAN GRAPHICS / FLEX</p>
          <div className="h-12"></div>
          <p className="font-medium text-gray-700 border-t border-gray-400 pt-1">
            Authorized Signatory
          </p>
        </div>
      </div>
    </div>
  );
});

GstSalesPrintDoc.displayName = "GstSalesPrintDoc";

export default GstSalesPrintDoc;
