import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Button from "../Button/Button";
import { CalendarIcon, ClearIcon } from "../icons";
import "./datepicker.css";

dayjs.extend(utc);

const Datepicker = ({
  type,
  FromDate,
  ToDate,
  setFromDate,
  setToDate,
  className = "",
  disableFuture = false,
  disablePast = false,
}) => {
  const clean = () => {
    setFromDate(null);
    setToDate(null);
  };

  return (
    <div>
      {type === "multipleDatePicker" && (
        <div className="flex items-center gap-4">
          <div className={`flex items-end gap-4 ${className} `}>
            <div className="relative w-full">
              <DateUiPicker
                onChange={(newValue) =>
                  setFromDate(
                    newValue ? dayjs(new Date(newValue)).format("YYYY-MM-DD") : null,
                  )
                }
                label="From Date"
                value={FromDate}
                disableFuture={disableFuture}
                disablePast={disablePast}
              />
            </div>
            <div className="relative w-full">
              <DateUiPicker
                onChange={(newValue) =>
                  setToDate(
                    newValue
                      ? dayjs(new Date(newValue))
                          .endOf("day")
                          .utc()
                          .format("YYYY-MM-DDTHH:mm:ss[Z]")
                      : null,
                  )
                }
                label="To Date"
                value={ToDate}
                disableFuture={disableFuture}
                disablePast={disablePast}
              />
            </div>
            <Button
              onClick={clean}
              icon1={<ClearIcon color="#ffffff" />}
              icon2={<ClearIcon />}
              label="Clear"
              className={"py-1.5! px-2!"}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Datepicker;

export const DateUiPicker = ({
  onChange,
  label,
  value,
  minDate = undefined,
  disabled = false,
  isClearable = false,
  className = "",
  disableFuture = false,
  disablePast = false,
}) => {
  const today = new Date();
  const resolvedMinDate = disablePast
    ? today
    : minDate && minDate !== false
      ? new Date(minDate)
      : undefined;

  return (
    <div className="flex flex-col" style={{ lineHeight: "10px" }}>
      <label className="text-base font-semibold">{label}</label>

      <div className="relative">
        <DatePicker
          showIcon
          toggleCalendarOnIconClick
          isClearable={isClearable}
          selected={value ? new Date(value) : null}
          onChange={onChange}
          dropdownMode="select"
          dateFormat="dd-MM-yyyy"
          placeholderText={label}
          popperPlacement="auto"
          disabled={disabled}
          minDate={resolvedMinDate}
          maxDate={disableFuture ? today : undefined}
          icon={
            <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-black cursor-pointer !p-0 !w-5 !h-5" />
          }
          className={`w-full text-sm border border-gray-400 focus:outline-none cursor-pointer rounded-md h-9 ${className}`}
        />
      </div>
    </div>
  );
};

