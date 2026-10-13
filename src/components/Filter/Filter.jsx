import { Radio } from "@mui/joy";
import { useEffect, useRef, useState } from "react";
import Button from "../Button/Button";
import { FilterIcon } from "../icons";

const Filter = ({ options = [], setSelected, onApply }) => {
  const [open, setOpen] = useState(false);
  const [filterValue, setFilterValue] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (item) => {
    setFilterValue(item);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        onClick={() => setOpen((prev) => !prev)}
        icon1={<FilterIcon />}
        icon2={<FilterIcon />}
        className="border border-[#9E77D2] hover:border-[#6f00ff]"
      />

      {open && (
        <div
          className="absolute right-0 top-12 bg-white rounded-lg p-4 w-60 z-50"
          style={{
            boxShadow: "rgba(0,0,0,0.15) 0px 4px 12px",
          }}
        >
          <div className="flex flex-col gap-2">
            {options.map((item) => (
              <Radio
                key={item.value}
                label={item.label}
                checked={filterValue?.value === item.value}
                onChange={() => handleChange(item)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setSelected(filterValue);
              onApply?.();
              setOpen(false);
            }}
            className="mt-4 w-full bg-indigo-600 text-white py-2 rounded"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
};

export default Filter;
