import { forwardRef } from "react";
import Logo from "../../assets/rayyanflexlogo.png";
import dayjs from "../../utils/dayjs";
import { formattedAmount } from "../../utils/FormatAmount";

const LocalSalesPrintDoc = forwardRef((props, ref) => {
  const {
    title = "Local Sales Report",
    status: _status = "paid",
    selectedCustomer = null,
    fromDate = null,
    toDate = null,
    records = [],
    generatedAt = new Date(),
  } = props;

  const totalSales = (records || []).reduce(
    (sum, item) => sum + (Number(item?.total_amount) || 0),
    0,
  );

  const totalCash = (records || []).reduce((sum, item) => {
    const itemCash = (item?.cash || []).reduce(
      (cSum, c) => cSum + (Number(c?.amount) || 0),
      0,
    );
    return sum + itemCash;
  }, 0);

  const totalGpay = (records || []).reduce((sum, item) => {
    const itemGpay = (item?.gpay || []).reduce(
      (gSum, g) => gSum + (Number(g?.amount) || 0),
      0,
    );
    return sum + itemGpay;
  }, 0);

  const totalNoRecieved = (records || []).reduce((sum, item) => {
    const itemNoRecieved = (item?.no_recieved || []).reduce(
      (nrSum, nr) => nrSum + (Number(nr?.amount) || 0),
      0,
    );
    return sum + itemNoRecieved;
  }, 0);

  const totalBalance = (records || []).reduce(
    (sum, item) => sum + (Number(item?.balance_amount) || 0),
    0,
  );

  const hasDateFilter = Boolean(fromDate && toDate);
  const hasCustomerFilter = Boolean(
    selectedCustomer?.label || selectedCustomer?.name,
  );
  const customerName = selectedCustomer?.label || selectedCustomer?.name || "";

  return (
    <div
      ref={ref}
      className="p-8 bg-white text-gray-900 font-sans print-document"
    >
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
            <img
              src={Logo}
              alt="Rayyan Flex"
              className="h-12 w-auto object-contain"
            />
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
          <span className="text-gray-500 font-medium block">
            Customer Filter:
          </span>
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
          <span className="text-gray-500 font-medium block">
            Total Entries:
          </span>
          <span className="font-semibold text-gray-800">
            {records.length} records
          </span>
        </div>
      </div>

      {/* ── LOCAL SALES DATA TABLE ── */}
      <div className="mb-6">
        <table className="w-full border-collapse border border-gray-300 text-xs">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="border border-gray-300 py-2 px-2 text-center w-10">
                #
              </th>
              <th className="border border-gray-300 py-2 px-2 text-center w-20">
                Date
              </th>
              <th className="border border-gray-300 py-2 px-2 text-center w-16">
                Bill No
              </th>
              <th className="border border-gray-300 py-2 px-2 text-left w-28">
                Customer
              </th>
              <th className="border border-gray-300 py-2 px-2 text-left">
                Particulars
              </th>
              <th className="border border-gray-300 py-2 px-2 text-right w-20">
                Total (₹)
              </th>
              <th className="border border-gray-300 py-2 px-2 text-right w-20">
                Cash (₹)
              </th>
              <th className="border border-gray-300 py-2 px-2 text-right w-20">
                GPay (₹)
              </th>
              <th className="border border-gray-300 py-2 px-2 text-right w-20">
                No Received (₹)
              </th>
              <th className="border border-gray-300 py-2 px-2 text-right w-20">
                Balance (₹)
              </th>
            </tr>
          </thead>

          <tbody>
            {records.map((item, index) => {
              const itemCash = (item.cash || []).reduce(
                (sum, c) => sum + (Number(c.amount) || 0),
                0,
              );
              const itemGpay = (item.gpay || []).reduce(
                (sum, g) => sum + (Number(g.amount) || 0),
                0,
              );
              const itemNoRecieved = (item.no_recieved || []).reduce(
                (sum, nr) => sum + (Number(nr.amount) || 0),
                0,
              );

              const particularsText = (item.particulars || [])
                .map((p) => p.text)
                .join(", ");

              return (
                <tr
                  key={item.documentId || item.id || index}
                  className={`page-break-inside-avoid ${index % 2 === 1 ? "bg-gray-50/70" : "bg-white"}`}
                >
                  <td className="border border-gray-300 py-1 px-1 text-center text-gray-500">
                    {index + 1}
                  </td>
                  <td className="border border-gray-300 py-1.5 px-2 text-center text-gray-800 font-medium whitespace-nowrap">
                    {item.date ? dayjs(item.date).format("DD/MM/YYYY") : "-"}
                  </td>
                  <td className="border border-gray-300 py-1.5 px-2 text-center text-gray-800 font-semibold">
                    {item.bill_no || "-"}
                  </td>
                  <td className="border border-gray-300 py-1.5 px-2 text-gray-900 font-normal break-words">
                    <div>{item.customer?.name || "-"}</div>
                    {item.customer?.phonenumber && (
                      <div className="text-[10px] text-gray-500 font-mono">
                        {item.customer.phonenumber}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-300 py-1.5 px-2 text-gray-700 text-[11px] break-words">
                    {particularsText || "-"}
                  </td>
                  <td className="border border-gray-300 py-1.5 px-2 text-right font-semibold text-gray-900">
                    {Number(item.total_amount) > 0
                      ? formattedAmount(item.total_amount)
                      : "-"}
                  </td>
                  <td className="border border-gray-300 py-1.5 px-2 text-right text-gray-800">
                    {itemCash > 0 ? formattedAmount(itemCash) : "-"}
                  </td>
                  <td className="border border-gray-300 py-1.5 px-2 text-right text-gray-800">
                    {itemGpay > 0 ? formattedAmount(itemGpay) : "-"}
                  </td>

                  <td className="border border-gray-300 py-1.5 px-2 text-right text-gray-800">
                    {itemNoRecieved > 0 ? formattedAmount(itemNoRecieved) : "-"}
                  </td>

                  <td
                    className={`border border-gray-300 py-1.5 px-2 text-right font-bold ${
                      Number(item.balance_amount) > 0
                        ? "text-red-600"
                        : "text-gray-900"
                    }`}
                  >
                    {Number(item.balance_amount) > 0
                      ? formattedAmount(item.balance_amount)
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-800 page-break-inside-avoid">
              <td
                colSpan={5}
                className="border border-gray-300 py-2 px-3 text-right uppercase text-xs"
              >
                Totals ({records.length} records):
              </td>
              <td className="border border-gray-300 py-2 px-2 text-right text-xs font-bold text-gray-900">
                ₹ {formattedAmount(totalSales)}
              </td>
              <td className="border border-gray-300 py-2 px-2 text-right text-xs font-bold text-gray-900">
                ₹ {formattedAmount(totalCash)}
              </td>
              <td className="border border-gray-300 py-2 px-2 text-right text-xs font-bold text-gray-900">
                ₹ {formattedAmount(totalGpay)}
              </td>

              <td className="border border-gray-300 py-2 px-2 text-right text-xs font-bold text-gray-900">
                ₹ {formattedAmount(totalNoRecieved)}
              </td>

              <td className="border border-gray-300 py-2 px-2 text-right text-xs font-extrabold text-red-600">
                ₹ {formattedAmount(totalBalance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── TOTALS SUMMARY BOX ── */}
      <div className="flex justify-end mb-8 page-break-inside-avoid">
        <div className="w-80 border border-gray-300 rounded-md overflow-hidden text-xs bg-gray-50/50">
          <div className="flex justify-between py-1.5 px-3 border-b border-gray-200">
            <span className="font-semibold text-gray-600 uppercase">
              Total Sales:
            </span>
            <span className="font-bold text-gray-900">
              ₹ {formattedAmount(totalSales)}
            </span>
          </div>

          <div className="flex justify-between py-1.5 px-3 border-b border-gray-200">
            <span className="font-semibold text-gray-600 uppercase">
              Total Cash:
            </span>
            <span className="font-bold text-gray-900">
              ₹ {formattedAmount(totalCash)}
            </span>
          </div>

          <div className="flex justify-between py-1.5 px-3 border-b border-gray-200">
            <span className="font-semibold text-gray-600 uppercase">
              Total GPay:
            </span>
            <span className="font-bold text-gray-900">
              ₹ {formattedAmount(totalGpay)}
            </span>
          </div>

          <div className="flex justify-between py-1.5 px-3 border-b border-gray-200">
            <span className="font-semibold text-gray-600 uppercase">
              Total No Received:
            </span>
            <span className="font-bold text-gray-900">
              ₹ {formattedAmount(totalNoRecieved)}
            </span>
          </div>

          <div className="flex justify-between py-2 px-3 bg-gray-100 text-sm font-extrabold border-t border-gray-300">
            <span className="uppercase text-gray-900">Total Balance:</span>
            <span
              className={totalBalance > 0 ? "text-red-600" : "text-green-700"}
            >
              ₹ {formattedAmount(totalBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* ── FOOTER & SIGNATORY SECTION ── */}
      <div className="pt-4 border-t border-gray-300 flex justify-between items-end text-xs text-gray-600 page-break-inside-avoid">
        <div>
          <p className="italic">* Computer-generated accounting statement.</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Printed from Rayyan Flex ERP System
          </p>
        </div>

        <div className="text-right">
          <p className="font-semibold text-gray-800 uppercase">
            For RAYYAN GRAPHICS / FLEX
          </p>
          <div className="h-12"></div>
          <p className="font-medium text-gray-700 border-t border-gray-400 pt-1">
            Authorized Signatory
          </p>
        </div>
      </div>
    </div>
  );
});

LocalSalesPrintDoc.displayName = "LocalSalesPrintDoc";

export default LocalSalesPrintDoc;
