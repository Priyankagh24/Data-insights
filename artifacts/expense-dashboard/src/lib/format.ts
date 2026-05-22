export function formatINR(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0.00";
  
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (absAmount >= 10000000) {
    // Crore
    const crores = absAmount / 10000000;
    return `${sign}₹${crores.toFixed(2)} Cr`;
  } else if (absAmount >= 100000) {
    // Lakh
    const lakhs = absAmount / 100000;
    return `${sign}₹${lakhs.toFixed(2)} L`;
  } else {
    // Format small numbers with Indian comma system
    return `${sign}₹${absAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export function formatPercent(value: number): string {
  if (value === undefined || value === null || isNaN(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

export function formatCompactNumber(number: number): string {
  if (number === undefined || number === null || isNaN(number)) return "0";
  return Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(number);
}
