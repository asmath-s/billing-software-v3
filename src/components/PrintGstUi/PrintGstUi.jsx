import dayjs from "dayjs";
import numberToWords from "number-to-words";
import { forwardRef, useMemo } from "react";
import { capitalizeFirstLetter } from "../../utils/Captialize";

const PrintGstUi = forwardRef((props, ref) => {
  const {
    billNo,
    date,
    printStatus,
    name,
    address,
    deliveryAddress,
    gstNo,
    sizeData,
    hsn,
    uom,
    baseAmount,
    taxAmount,
    finalAmount,
    less,
    method,
    gstPercentage,
  } = props;

  const totalInWords = useMemo(() => {
    const amount = Math.round(Number(finalAmount || 0));

    return (
      numberToWords.toWords(amount).charAt(0).toUpperCase() +
      numberToWords.toWords(amount).slice(1)
    );
  }, [finalAmount]);

  const formatCurrency = (value) =>
    `₹ ${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div>
      <div className="w-[794px] h-[842px] relative" ref={ref}>
        <div className="m-[25px]">
          {/* Header */}
          <div className="flex items-center border text-sm border-b-[0px] mt-[190px]">
            <p className="pl-[5px]">GSTIN No: 33ABJFR6249N1ZL</p>
            <h4 className="pl-[100px] font-bold">TAX INVOICE</h4>
          </div>

          {/* Invoice Info */}
          <div className="flex border-t border-l text-sm">
            <p className="pl-[5px] w-[15%] border-r">Number</p>
            <p className="pl-[5px] w-[15%] border-r">{billNo}</p>
            <p className="pl-[5px] w-[15%] border-r">Date</p>
            <p className="pl-[5px] w-[15%] border-r">
              {dayjs(date).format("DD-MM-YYYY")}
            </p>
            <p className="pl-[5px] w-[15%] border-r">Eway Bill</p>
            <p className="pl-[5px] w-[15%] border-r"></p>
            <p className="pl-[5px] w-[15%] border-r">{printStatus}</p>
          </div>

          {/* Address Section */}
          <div className="flex border-t border-l text-sm h-[110px]">
            <div className="w-[49.9%] border-r pt-[5px]">
              <h5 className="pl-[5px]">To</h5>
              <p className="pl-[20px] uppercase font-medium">{name?.toUpperCase()}</p>
              <p className="pl-[20px] uppercase">{address?.toUpperCase()}</p>
              {gstNo && <p className="pl-[20px] uppercase">GSTIN: {gstNo?.toUpperCase()}</p>}
            </div>

            <div className="w-[50.1%] border-r pt-[5px]">
              <h5 className="pl-[5px]">Delivery To</h5>
              <p className="pl-[20px] uppercase font-medium">{name?.toUpperCase()}</p>
              <p className="pl-[20px] uppercase">
                {(!deliveryAddress ? address : deliveryAddress)?.toUpperCase()}
              </p>
              {gstNo && <p className="pl-[20px] uppercase">GSTIN: {gstNo?.toUpperCase()}</p>}
            </div>
          </div>

          {/* Table */}
          <div className="h-[405px] border flex flex-col relative">
            <div className="flex items-center text-center border-b bg-[#b7b7b7] text-sm">
              <h5 className="w-[5%] border-r">Sl</h5>
              <h5 className="w-[45%] border-r">Paticulars</h5>
              <h5 className="w-[10%] border-r">HSN/SAC</h5>
              <h5 className="w-[7%] border-r">UOM</h5>
              <h5 className="w-[10%] border-r">Quantity</h5>
              <h5 className="w-[10%] border-r">Rate</h5>
              <h5 className="w-[13%]">Amount</h5>
            </div>

            {/* Empty grid */}
            <div className="flex relative h-[388px]">
              {[5, 45, 10, 7, 10, 10, 13].map((w, i) => (
                <div
                  key={i}
                  className={`w-[${w}%]  ${i === 6 ? "" : "border-r"} h-full`}
                />
              ))}
            </div>

            {/* Data rows */}
            <div className="flex flex-col absolute top-[20px] w-full">
              {sizeData?.map((data, index) => {
                const inst = capitalizeFirstLetter(data.instruction || "");
                const particulars =
                  data.type?.toLowerCase() === "flex"
                    ? `${inst}${inst ? " " : ""}${data.width} X ${data.height}`
                    : inst || "-";

                const pieceCount = Number(data.piece_count) || 1;
                const perPieceRate =
                  Number(data.per_piece_total) > 0
                    ? Number(data.per_piece_total) / pieceCount
                    : Number(data.per_piece_amount) > 0
                      ? Number(data.per_piece_amount)
                      : 0;

                return (
                  <div
                    className="flex items-center pt-[10px]"
                    key={data.id || index}
                  >
                    <p className="w-[38px] text-[14px] text-center">
                      {index + 1}
                    </p>

                    <p className="w-[334px] text-[14px] pl-[5px] break-words">
                      {particulars}
                    </p>

                    <p className="w-[74px] text-[14px] text-center">{hsn}</p>

                    <p className="w-[50px] text-[14px] text-center">{uom}</p>

                    <p className="w-[72px] text-[14px] text-center">
                      {data.piece_count || 0}
                    </p>

                    <p className="w-[72px] text-[14px] text-right pr-[3px]">
                      {perPieceRate.toFixed(2)}
                    </p>

                    <p className="w-[95px] text-[14px] text-right pr-[3px]">
                      {formatCurrency(data.per_piece_total)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="h-[110px] flex border border-t-[0px]">
            <div className="w-[20%] text-[13px]">
              <p className="py-[2px] pl-[5px] border-b border-r">
                Place of Supply
              </p>
              <p className="py-[2px] pl-[5px] border-b border-r">Transport</p>
              <p className="py-[2px] pl-[5px] border-b border-r">L.R.No.</p>
            </div>

            <div className="w-[40%] text-[13px] border-r">
              <p className="py-[2px] pl-[5px] border-b">
                SIVAKASI, 33 - TAMILNADU
              </p>
              <p className="py-[2px] pl-[5px] border-b">-</p>
              <p className="py-[2px] pl-[5px] border-b">-</p>
            </div>

            <div className="w-[27%] border-r">
              <p className="text-sm pl-[50px]">Goods Value</p>

              {method === "gst" ? (
                <>
                  <p className="text-sm pl-[50px]">
                    CGST @ {gstPercentage / 2} %
                  </p>
                  <p className="text-sm pl-[50px]">
                    SGST @ {gstPercentage / 2} %
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm pl-[50px]">IGST @ {gstPercentage} %</p>
                </>
              )}

              <p className="text-sm pl-[50px]">
                {less == 0 ? (
                  <span style={{ color: "#ffffff00" }}>empty</span>
                ) : less < 0 ? (
                  "Less:"
                ) : (
                  "Add:"
                )}
              </p>
              {method !== "gst" && <p style={{ color: "#ffffff00" }}>empty</p>}
              <h5 className="text-[15px] pl-[50px] pt-[3px] font-semibold">
                Total Amount
              </h5>
            </div>
            <div className="w-[13%] flex flex-col items-end pr-[5px] text-sm">
              <p>{formatCurrency(baseAmount)}</p>
              {method === "gst" ? (
                <>
                  <p>{formatCurrency(Number(taxAmount || 0) / 2)}</p>
                  <p>{formatCurrency(Number(taxAmount || 0) / 2)}</p>
                </>
              ) : (
                <>
                  <p>{formatCurrency(taxAmount)}</p>
                </>
              )}

              <p>
                {less == 0 ? (
                  <span className="text-transparent">empty</span>
                ) : (
                  less
                )}
              </p>
              {method !== "gst" && <p style={{ color: "#ffffff00" }}>empty</p>}
              <h5 className="text-[15px] border-t border-dotted pt-[3px] font-semibold">
                {formatCurrency(finalAmount)}
              </h5>
            </div>
          </div>

          {/* Amount in words */}
          <div className="border border-t-[0px]">
            <p className="capitalize text-sm py-[3px] text-center">
              Rupees: {totalInWords} Only
            </p>
          </div>

          {/* Footer */}
          <p className="text-[10px] text-center pt-[5px]">
            Certified that the particulars given above are true and correct
          </p>

          <div className="flex mt-[5px] justify-between items-end pt-[10px] text-sm">
            <span className="text-[10px]">E.&O.E</span>
            <div>
              <p>For Rayyan Graphics</p>
              <p className="pt-[25px]">Authorised Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

PrintGstUi.displayName = "PrintGstUi";

export default PrintGstUi;
