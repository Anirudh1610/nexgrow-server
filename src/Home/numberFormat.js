// Utility for Indian number formatting
export const formatINR = (value, {decimals=2, allowZeroDecimals=false} = {}) => {
  if (value === null || value === undefined || value === '') return '0';
  const num = Number(value);
  if (isNaN(num)) return '0';
  const opts = { maximumFractionDigits: decimals, minimumFractionDigits: allowZeroDecimals ? decimals : 0 }; 
  return new Intl.NumberFormat('en-IN', opts).format(num);
};

export const formatPercent = (value, {decimals=2} = {}) => {
  if (value === null || value === undefined || value === '') return '0';
  const num = Number(value);
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: 0 }).format(num);
};
