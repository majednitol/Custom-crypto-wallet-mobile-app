export function formatDollar(amount: number): string {
  const safeAmount = isNaN(amount) || amount === undefined ? 0 : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2, 
  }).format(safeAmount);
}

export function formatDollarRaw(amount: number): string {
  const safeAmount = isNaN(amount) || amount === undefined ? 0 : amount;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  }).format(safeAmount);
}
