export const capitalizeFirstLetter = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
};
