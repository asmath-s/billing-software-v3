import { forwardRef } from "react";
import Logo from "../../assets/rayyanflexlogo.png";
import dayjs from "../../utils/dayjs";

const CustomerPrintDoc = forwardRef((props, ref) => {
  const {
    title = "Customers Directory",
    isGst = false,
    records = [],
    searchText = "",
    generatedAt = new Date(),
  } = props;

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
            display: table-row-group;
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

      {/* ── INFO BOX ── */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4 text-xs grid grid-cols-2 gap-2">
        <div>
          <span className="text-gray-500 font-medium block">Filter Applied:</span>
          <span className="font-semibold text-gray-800">
            {searchText ? `Search Filter: "${searchText}"` : "All Customers"}
          </span>
        </div>

        <div>
          <span className="text-gray-500 font-medium block">Total Count:</span>
          <span className="font-semibold text-gray-800">
            {records.length} {records.length === 1 ? "Customer" : "Customers"}
          </span>
        </div>
      </div>

      {/* ── CUSTOMERS TABLE ── */}
      <table className="w-full text-xs border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300">
            <th
              className="border border-gray-300 p-2 text-center"
              style={{ width: "6%" }}
            >
              #
            </th>
            <th
              className="border border-gray-300 p-2 text-left"
              style={{ width: isGst ? "24%" : "44%" }}
            >
              Customer Name
            </th>
            {isGst ? (
              <>
                <th
                  className="border border-gray-300 p-2 text-left"
                  style={{ width: "16%" }}
                >
                  GSTIN
                </th>
                <th
                  className="border border-gray-300 p-2 text-left"
                  style={{ width: "24%" }}
                >
                  Billing Address
                </th>
                <th
                  className="border border-gray-300 p-2 text-left"
                  style={{ width: "18%" }}
                >
                  Delivery Address
                </th>
              </>
            ) : (
              <th
                className="border border-gray-300 p-2 text-left"
                style={{ width: "32%" }}
              >
                Phone Number
              </th>
            )}
            <th
              className="border border-gray-300 p-2 text-center"
              style={{ width: isGst ? "12%" : "18%" }}
            >
              Created Date
            </th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td
                colSpan={isGst ? 6 : 4}
                className="border border-gray-300 p-4 text-center text-gray-400 italic"
              >
                No customer records to display.
              </td>
            </tr>
          ) : (
            records.map((c, i) => (
              <tr
                key={c.documentId || c.id || i}
                className="border-b border-gray-200 page-break-inside-avoid"
              >
                <td className="border border-gray-300 p-2 text-center font-medium text-gray-500">
                  {i + 1}
                </td>
                <td className="border border-gray-300 p-2 font-semibold text-gray-900">
                  {c.name || "-"}
                </td>
                {isGst ? (
                  <>
                    <td className="border border-gray-300 p-2 font-mono">
                      {c.gst_no || c.gstno || "-"}
                    </td>
                    <td className="border border-gray-300 p-2 text-gray-700">
                      {c.address || "-"}
                    </td>
                    <td className="border border-gray-300 p-2 text-gray-700">
                      {c.delivery_address || "-"}
                    </td>
                  </>
                ) : (
                  <td className="border border-gray-300 p-2 font-mono text-gray-700">
                    {c.phonenumber || "-"}
                  </td>
                )}
                <td className="border border-gray-300 p-2 text-center text-gray-600">
                  {c.createdAt ? dayjs(c.createdAt).format("DD-MM-YYYY") : "-"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
});

CustomerPrintDoc.displayName = "CustomerPrintDoc";
export default CustomerPrintDoc;
