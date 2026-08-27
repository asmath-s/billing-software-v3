/**
 * Name Normalization and Matching Utility
 *
 * Normalizes customer and vendor names to treat names as the same person/company
 * regardless of capitalization, multiple spaces, leading/trailing spaces, or space removal.
 *
 * Examples:
 * - "Smile Foundation"
 * - "smile foundation"
 * - "SMILE FOUNDATION"
 * - "smilefoundation"
 * - "SmileFoundation"
 * - "smile   foundation"
 * - " SMILE FOUNDATION "
 * all resolve to the same normalized key: "smilefoundation"
 */

/**
 * Normalizes a name string by removing all whitespace and converting to lowercase.
 * @param {string} str
 * @returns {string} e.g. "smilefoundation"
 */
export const normalizeName = (str) => {
  if (typeof str !== "string") return "";
  return str.toLowerCase().replace(/\s+/g, "").trim();
};

/**
 * Normalizes a name string with single spaces between words and lowercase.
 * @param {string} str
 * @returns {string} e.g. "smile foundation"
 */
export const normalizeNameWithSpaces = (str) => {
  if (typeof str !== "string") return "";
  return str.trim().toLowerCase().replace(/\s+/g, " ");
};

/**
 * Checks if two name strings match (space-insensitive and case-insensitive).
 * @param {string} nameA
 * @param {string} nameB
 * @returns {boolean}
 */
export const isNameMatch = (nameA, nameB) => {
  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);
  if (!normA || !normB) return false;
  return normA === normB;
};

/**
 * Finds an entity in a list whose name matches the entered name after normalization.
 * Supports string items, objects with nameKey (default 'name'), or labelKey ('label').
 *
 * @param {string} enteredName - The input name typed by the user
 * @param {Array} list - Array of objects or strings
 * @param {string} [nameKey="name"] - Property name for name comparison
 * @returns {any|null} The matching entity from list or null
 */
export const findMatchingEntity = (enteredName, list = [], nameKey = "name") => {
  const normalizedInput = normalizeName(enteredName);
  if (!normalizedInput || !Array.isArray(list)) return null;

  return (
    list.find((item) => {
      if (!item) return false;
      if (typeof item === "string") {
        return normalizeName(item) === normalizedInput;
      }
      const val = item[nameKey] ?? item.label ?? item.name;
      return normalizeName(val) === normalizedInput;
    }) || null
  );
};

/**
 * Custom filter function for MUI Autocomplete components.
 * Performs case-insensitive and space-insensitive substring & full matching.
 *
 * @param {Array} options - List of options (strings or objects)
 * @param {Object} state - MUI Autocomplete state containing { inputValue }
 * @param {Function} [getOptionLabel] - Optional custom label extractor
 * @returns {Array} Filtered options
 */
export const filterOptionsNormalized = (options, state, getOptionLabel) => {
  const { inputValue } = state;
  const normalizedQuery = normalizeName(inputValue);

  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) => {
    if (!option) return false;
    let label = "";
    if (typeof getOptionLabel === "function") {
      label = getOptionLabel(option) || "";
    } else if (typeof option === "string") {
      label = option;
    } else if (typeof option === "object") {
      label = option.label ?? option.name ?? "";
    }

    const normalizedLabel = normalizeName(label);
    return normalizedLabel.includes(normalizedQuery);
  });
};
