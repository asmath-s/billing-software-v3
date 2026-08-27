import { Table } from "@mui/joy";
import dayjs from "dayjs";
import { forwardRef } from "react";

import Logo from "../../assets/logo2.jpg";
import { capitalizeFirstLetter } from "../../utils/Captialize";
import { MailIcon, PhoneIcon } from "../icons";

const DeliveryUi = forwardRef((props, ref) => {
  const billItems = props?.sizedata || [];

  const totalQuantity = billItems.reduce(
    (total, item) => total + (Number(item?.piece_count) || 0),
    0,
  );

  const filledSizedata = [
    ...billItems,
    ...Array(Math.max(0, 12 - billItems.length)).fill({
      width: "",
      height: "",
      piece_count: "",
      instruction: "",
      material: "",
      type: "",
    }),
  ];

  return (
    <div className="w-[210mm] h-[145mm]" ref={ref}>
      <div className="relative">
        <div className="w-[390px] my-0 mx-auto pt-[0px] pb-[10px] px-[10px]">
          <div className="flex justify-between items-center border-b pb-[2px]">
            <img src={Logo} width={100} height={100} alt="Logo" />

            <p className="absolute right-[45%] top-[18px] text-center text-[14px]">
              Invoice No: {props.billno}
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
              <p>{dayjs(props.date).format("DD-MM-YYYY")}</p>
            </div>
          </div>

          <div className="mt-[5px]">
            <Table borderAxis="y" className="border border-[#E0E1E3]">
              <thead>
                <tr>
                  <th className="!bg-[#2A3042] !text-white !w-[48%] !h-[20px]">
                    Particular
                  </th>

                  <th className="!bg-[#2A3042] !text-white !w-[18%] !h-[20px] text-center">
                    Size
                  </th>

                  <th className="!bg-[#2A3042] !text-white !w-[12%] !h-[20px] text-center">
                    Pcs
                  </th>
                </tr>
              </thead>

              <tbody>
                {filledSizedata.map((data, index) => {
                  const isFlex = data?.type?.toLowerCase() === "flex";

                  return (
                    <tr className="h-[24px]" key={index}>
                      <td className="w-[48%] !h-[24px] !p-[0px] !pr-[5px] capitalize">
                        {capitalizeFirstLetter(data?.instruction || "")}
                      </td>

                      <td className="w-[18%] !h-[24px] !p-[0px] text-center">
                        {isFlex ? `${data.width} X ${data.height}` : ""}
                      </td>

                      <td className="w-[12%] !h-[24px] !p-[0px] text-center">
                        {data?.piece_count || ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan={2} style={{ height: "25px", padding: "0" }}>
                    <div className="flex flex-col items-end mr-2">
                      <p className="text-[12px] font-medium">Total</p>
                    </div>
                  </td>

                  <td style={{ paddingRight: "0" }}>
                    <div className="flex flex-col items-end">
                      <p className="text-[12px] font-medium">
                        {totalQuantity} Pcs
                      </p>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td colSpan={3} className="!bg-[#fff] !p-0">
                    <div className="flex justify-between border-b-5 border-[#2A3042] pt-[1px]">
                      <p className="text-sm ml-[10px]">Customer Sign</p>

                      <div className="flex flex-col items-end gap-3 pr-2">
                        <p className="font-semibold text-[12px]">
                          For Rayyan Graphics
                        </p>

                        <span className="text-[12px]">
                          Authorised Signatory
                        </span>
                      </div>
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

DeliveryUi.displayName = "DeliveryUi";

export default DeliveryUi;
