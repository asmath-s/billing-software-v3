export const capitalizeFirstLetter = (text) => {
  if (!text) return "";
  if (typeof text !== "string") return String(text);
  return text
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
};

