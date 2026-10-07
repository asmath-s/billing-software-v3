import { useEffect, useRef, useState } from "react";
import { materialdata } from "../../lib/materialdata";
import { capitalizeFirstLetter } from "../../utils/Captialize";
import { isNormalCalculatedCustomer } from "../../utils/nameNormalizer";
import AutocompleteField from "../AutocompleteField/AutocompleteField";
import Button from "../Button/Button";
import { AddIcon, DeleteIcon } from "../icons";
import InputField from "../InputField/InputField";

const createRow = (type) => ({
  type,
  width: "",
  height: "",
  material: "",
  sq_ft_price: "",
  piece_count: 1,
  instruction: "",
  per_piece_amount: "",
  per_piece_total: 0,
});

export const calculateFlexTotal = (
  row,
  customerName = "",
  normalCalculatedCustomer = [],
) => {
  const width = Number(row.width) || 0;
  const height = Number(row.height) || 0;
  const rate = Number(row.sq_ft_price) || 0;
  const pieces = Number(row.piece_count) || 1;

  if (width && height && rate) {
    const area = width * height;
    const calculated = area * rate * pieces;

    if (isNormalCalculatedCustomer(customerName, normalCalculatedCustomer)) {
      return Number(calculated.toFixed(2));
    }

    if (calculated >= 100 && (area >= 10 || area * pieces >= 20 || rate > 10)) {
      return Number(calculated.toFixed(2));
    } else {
      return 100 * pieces;
    }
  }

  return 0;
};

const FormDataInput = ({
  sizeData = [],
  setSizeData,
  customerName = "",
  normalCalculatedCustomer = [],
}) => {
  const [errorMsg, setErrorMsg] = useState("");

  const isNormal = isNormalCalculatedCustomer(
    customerName,
    normalCalculatedCustomer,
  );
  const prevIsNormalRef = useRef(isNormal);

  useEffect(() => {
    if (prevIsNormalRef.current !== isNormal) {
      prevIsNormalRef.current = isNormal;
      setSizeData((prevSizeData) => {
        let hasChanges = false;
        const nextSizeData = prevSizeData.map((row) => {
          if (row.type === "flex") {
            const newTotal = calculateFlexTotal(
              row,
              customerName,
              normalCalculatedCustomer,
            );
            if (newTotal !== row.per_piece_total) {
              hasChanges = true;
              return { ...row, per_piece_total: newTotal };
            }
          }
          return row;
        });
        return hasChanges ? nextSizeData : prevSizeData;
      });
    }
  }, [isNormal, customerName, normalCalculatedCustomer, setSizeData]);

  /* ---------------- VALIDATION ---------------- */

  const validateLastRow = () => {
    const lastRow = sizeData[sizeData.length - 1];

    if (!lastRow) return true;

    if (lastRow.type === "flex") {
      const width = Number(lastRow.width);
      const height = Number(lastRow.height);
      const rate = Number(lastRow.sq_ft_price);

      if (!width || !height || !rate) {
        setErrorMsg("Please complete the current flex row first.");
        return false;
      }
    }

    if (lastRow.type === "instruction") {
      const amount = Number(lastRow.per_piece_amount);
      const pieces = Number(lastRow.piece_count);

      if (
        !lastRow.instruction ||
        !amount ||
        !pieces
      ) {
        setErrorMsg("Please complete the current instruction row first.");
        return false;
      }
    }

    return true;
  };

  /* ---------------- ADD ROW ---------------- */

  const addRow = (type) => {
    setErrorMsg("");
    if (!validateLastRow()) return;
    setSizeData([...sizeData, createRow(type)]);
  };

  /* ---------------- REMOVE ROW ---------------- */

  const removeRow = (index) => {
    const updated = [...sizeData];
    updated.splice(index, 1);
    setSizeData(updated);
  };

  /* ---------------- UPDATE ROW ---------------- */
  const decimalFields = [
    "width",
    "height",
    "sq_ft_price",
    "per_piece_amount",
  ];

  const updateRow = (index, name, value) => {
    // For decimal fields, allow digits and at most one decimal point
    if (decimalFields.includes(name)) {
      if (value !== "" && !/^\d*\.?\d*$/.test(value)) {
        return;
      }
    } else if (name === "piece_count") {
      // For piece_count, allow only integer digits
      if (value !== "" && !/^\d*$/.test(value)) {
        return;
      }
    }

    const updated = [...sizeData];
    updated[index] = {
      ...updated[index],
      [name]: value,
    };

    const row = updated[index];

    const pieces = Number(row.piece_count) || 1;
    const amount = Number(row.per_piece_amount) || 0;

    /* ---------- FLEX CALCULATION ---------- */
    if (row.type === "flex") {
      row.per_piece_total = calculateFlexTotal(
        row,
        customerName,
        normalCalculatedCustomer,
      );
    }

    /* ---------- INSTRUCTION CALCULATION ---------- */
    if (row.type === "instruction") {
      row.per_piece_total = Number((pieces * amount).toFixed(2));
    }

    setSizeData(updated);
  };

  const handleDecimalBlur = (index, name) => {
    const row = sizeData[index];
    if (!row) return;
    let val = String(row[name] ?? "").trim();
    if (val === "") return;
    if (val === ".") {
      updateRow(index, name, "");
      return;
    }
    if (val.startsWith(".")) {
      val = "0" + val;
    }
    if (val.endsWith(".")) {
      val = val.slice(0, -1);
    }
    if (val !== String(row[name])) {
      updateRow(index, name, val);
    }
  };

  const handlePieceCountBlur = (index) => {
    const row = sizeData[index];
    if (!row) return;
    const count = Number(row.piece_count);
    if (!count || count < 1) {
      updateRow(index, "piece_count", 1);
    }
  };

  const formatValue = (val) => {
    if (val === 0 || val === null || val === undefined) return "";
    return val;
  };

  return (
    <div>
      {sizeData.map((row, index) => {
        if (row.type === "flex") {
          return (
            <div key={`flex-${index}`} className="flex gap-4 my-4">
              <InputField
                placeholder="Instruction"
                value={row.instruction}
                onChange={(e) =>
                  updateRow(index, "instruction", e.target.value)
                }
                onBlur={() =>
                  updateRow(
                    index,
                    "instruction",
                    capitalizeFirstLetter(row.instruction || ""),
                  )
                }
              />

              <InputField
                placeholder="Width"
                type="text"
                value={formatValue(row.width)}
                onChange={(e) => updateRow(index, "width", e.target.value)}
                onBlur={() => handleDecimalBlur(index, "width")}
                required
              />

              <InputField
                placeholder="Height"
                type="text"
                value={formatValue(row.height)}
                onChange={(e) => updateRow(index, "height", e.target.value)}
                onBlur={() => handleDecimalBlur(index, "height")}
                required
              />

              <AutocompleteField
                label="Material"
                value={row.material}
                options={materialdata}
                onChange={(e, value) => updateRow(index, "material", value)}
                onInputChange={(e, value) =>
                  updateRow(index, "material", value)
                }
                required
              />

              <InputField
                placeholder="Sq.ft Rate"
                type="text"
                value={formatValue(row.sq_ft_price)}
                onChange={(e) =>
                  updateRow(index, "sq_ft_price", e.target.value)
                }
                onBlur={() => handleDecimalBlur(index, "sq_ft_price")}
                required
              />

              <InputField
                placeholder="Piece Count"
                type="text"
                dontallowDecimal
                value={formatValue(row.piece_count)}
                onChange={(e) =>
                  updateRow(index, "piece_count", e.target.value)
                }
                onBlur={() => handlePieceCountBlur(index)}
                required
              />

              <Button
                onClick={() => removeRow(index)}
                icon1={<DeleteIcon color="#fff" />}
                icon2={<DeleteIcon />}
                className="h-[38px] mt-5.5 border-gray-400"
              />
            </div>
          );
        }

        if (row.type === "instruction") {
          return (
            <div key={`instruction-${index}`} className="flex gap-4 my-4">
              <InputField
                placeholder="Instruction"
                value={row.instruction}
                onChange={(e) =>
                  updateRow(index, "instruction", e.target.value)
                }
                onBlur={() =>
                  updateRow(
                    index,
                    "instruction",
                    capitalizeFirstLetter(row.instruction || ""),
                  )
                }
              />

              <InputField
                placeholder="Piece Count"
                type="text"
                dontallowDecimal
                value={formatValue(row.piece_count)}
                onChange={(e) =>
                  updateRow(index, "piece_count", e.target.value)
                }
                onBlur={() => handlePieceCountBlur(index)}
              />

              <InputField
                placeholder="Amount"
                type="text"
                value={formatValue(row.per_piece_amount)}
                onChange={(e) =>
                  updateRow(index, "per_piece_amount", e.target.value)
                }
                onBlur={() => handleDecimalBlur(index, "per_piece_amount")}
              />

              <Button
                onClick={() => removeRow(index)}
                icon1={<DeleteIcon color="#fff" />}
                icon2={<DeleteIcon />}
                className="h-[38px] mt-5.5 border-gray-400"
              />
            </div>
          );
        }

        return null;
      })}

      <div className="flex gap-4 items-center justify-end mt-4">
        <p className="text-red-500 mr-4">{errorMsg}</p>

        <Button
          onClick={() => addRow("flex")}
          icon1={<AddIcon color="#fff" />}
          icon2={<AddIcon />}
          label="Add Flex"
        />

        <Button
          onClick={() => addRow("instruction")}
          icon1={<AddIcon color="#fff" />}
          icon2={<AddIcon />}
          label="Add Instruction"
        />
      </div>
    </div>
  );
};

export default FormDataInput;
