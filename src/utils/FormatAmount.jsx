export const formattedAmount = (amount) => {
  const num = Number(amount);
  const safeAmount = isNaN(num) ? 0 : num;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(safeAmount);
};

