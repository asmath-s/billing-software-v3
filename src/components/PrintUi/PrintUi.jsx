import { Table } from "@mui/joy";
import { forwardRef } from "react";
import Logo from "../../assets/logo2.jpg";
import { capitalizeFirstLetter } from "../../utils/Captialize";
import { MailIcon, PhoneIcon } from "../icons";

const PrintUi = forwardRef((props, ref) => {
  let filledSizeData = [];

  if (props?.sizeData) {
    const totalRows = props.sizeData.length;
    filledSizeData = [
      ...props.sizeData,
      ...Array(Math.max(0, 12 - totalRows)).fill({
        type: "",
        width: "",
        height: "",
        material: "",
        instruction: "",
        piece_count: "",
        sq_ft_price: "",
        per_piece_total: "",
        per_piece_amount: "",
      }),
    ];
  } else {
    filledSizeData = Array(12).fill({
      type: "",
      width: "",
      height: "",
      material: "",
      instruction: "",
      piece_count: "",
      sq_ft_price: "",
      per_piece_total: "",
      per_piece_amount: "",
    });
  }

  return (
    <div className="w-[210mm] h-[145mm]" ref={ref}>
      <div className="relative">
        <div className="w-[390px] my-0 mx-auto pt-[0px] pb-[10px] px-[10px]">
          <div className="flex justify-between items-center border-b pb-[2px]">
            <img src={Logo} width={100} height={100} alt="Logo" />

            <p className="absolute right-[45%] top-[18px] text-center text-[14px]">
              Bill No: {props.billNo}
            </p>

            <div>
              <div className="flex items-center justify-end">
                <PhoneIcon />
                <div className="pl-2">
                  <p className="text-[12px] font-medium">+91 63823 81389</p>
                  <p className="text-[12px] font-medium">+91 63809 74082</p>
                </div>
              </div>

              <div className="flex items-center">
                <MailIcon />
                <p className="text-[12px] font-medium pl-2">
                  rayyanflex@gmail.com
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-[5px]">
            <div className="flex text-[12px] w-[70%] gap-1 overflow-hidden">
              <span>Name:</span>

              <p className="truncate text-ellipsis overflow-hidden whitespace-nowrap">
                {props.name}
              </p>
            </div>

            <div className="flex text-[12px] gap-1">
              <span>Date:</span>
              <p>{props.date}</p>
            </div>
          </div>

          <div className="mt-[5px]">
            <Table borderAxis="y" className="border border-[#E0E1E3]">
              <thead>
                <tr>
                  <th className="!bg-[#2A3042] !text-white !w-[48%] !h-[20px]">
                    Particular
                  </th>

                  <th className="!bg-[#2A3042] !text-white !w-[12%] !h-[20px] text-center">
                    Pcs
                  </th>

                  <th className="!bg-[#2A3042] !text-white !w-[14%] !h-[20px] text-center">
                    Sq.Ft
                  </th>
                  <th className="!bg-[#2A3042] !text-white !w-[22%] !h-[20px] text-center">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {filledSizeData?.map((data, index) => (
                  <tr key={index} style={{ height: "24px" }}>
                    {data.type === "flex" ? (
                      <td className="w-[48%] !h-[24px] !p-[0px] !pr-[5px] !pl-[3px] capitalize">
                        {data.width} X {data.height}{" "}
                        {data.instruction
                          ? `${capitalizeFirstLetter(data.instruction)} `
                          : ""}
                        {data.material}
                      </td>
                    ) : (
                      <>
                        {data.type === "instruction" && (
                          <td className="w-[48%] !h-[24px] !p-[0px] !pr-[5px] !pl-[3px] capitalize">
                            {capitalizeFirstLetter(data.instruction || "")}
                          </td>
                        )}
                      </>
                    )}
                    <td className="w-[12%] !h-[24px] !p-[0px] text-center">
                      {data.piece_count}
                    </td>
                    <td className="w-[14%] !h-[24px] !p-[0px] text-center">
                      {data.type === "flex"
                        ? data.sq_ft_price
                        : data.type === "instruction" && "-"}
                    </td>
                    <td className="w-[22%] !h-[24px] !p-[0px] !pr-[4px] text-right">
                      {data.per_piece_total && (
                        <span>₹ {data.per_piece_total}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" style={{ height: "25px", padding: "0" }}>
                    <div className="flex flex-col items-end mr-2">
                      <p className="text-[12px] font-medium">Total </p>
                      {props.advance !== 0 && props.balance > 0 && (
                        <>
                          <p className="text-[12px] font-medium">Advance </p>
                          <p className="text-[12px] font-medium">Blance </p>
                        </>
                      )}
                    </div>
                  </td>
                  <td style={{ paddingRight: "0" }}>
                    <div className="flex flex-col items-end ">
                      <p className="text-[12px] font-medium !pr-[4px]">
                        {" "}
                        ₹ {props.amount}
                      </p>
                      {props.advance !== 0 && props.balance > 0 && (
                        <>
                          <p className="text-[12px] font-medium !pr-[4px]">
                            {" "}
                            ₹ {props.advance}
                          </p>
                          <p className="text-[12px] font-semibold border-t !pr-[4px]">
                            {" "}
                            ₹ {props.balance}
                          </p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan="4"
                    style={{ background: "#fff", padding: "0px" }}
                  >
                    <div className="flex flex-col items-end gap-3 border-b-5 border-[#2A3042] pt-[1px] pr-2">
                      <p className="font-semibold text-[12px]">
                        For Rayyan Graphics
                      </p>
                      <span className="text-[12px]">Authorised Signatory</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
});

PrintUi.displayName = "PrintUi";

export default PrintUi;
