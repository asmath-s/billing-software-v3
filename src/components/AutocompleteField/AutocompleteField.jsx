import { Autocomplete } from "@mui/joy";
import { filterOptionsNormalized } from "../../utils/nameNormalizer";

const AutocompleteField = ({
  label,
  value = "",
  onChange,
  options = [],
  getOptionLabel,
  onInputChange,
  onBlur,
  required,
  disabled,
  filterOptions,
  ...rest
}) => {
  const customFilter =
    filterOptions ||
    ((opts, state) => filterOptionsNormalized(opts, state, getOptionLabel));

  return (
    <div className="w-full">
      <label className="text-base font-semibold">{label}</label>
      <Autocomplete
        freeSolo
        autoComplete={false}
        autoHighlight={false}
        autoSelect={false}
        clearOnBlur={false}
        options={options.filter(Boolean)}
        value={value}
        onChange={onChange}
        onInputChange={onInputChange}
        onBlur={onBlur}
        placeholder={label}
        getOptionLabel={getOptionLabel}
        filterOptions={customFilter}
        sx={{
          border: "1px solid #9ea5b2",
          borderRadius: "6px",
          height: "36px",
          background: "#fff",
          boxShadow: "none",
        }}
        slotProps={{
          input: {
            autoComplete: "off",
          },
        }}
        required={required}
        disabled={disabled}
        {...rest}
      />
    </div>
  );
};

export default AutocompleteField;
