/**
 * Currency formatting utilities
 */

/**
 * Currency symbols mapping
 */
const CURRENCY_SYMBOLS = {
  INR: '₹',
  AED: 'AED ',
  USD: '$',
  EUR: '€',
  GBP: '£'
};

/**
 * Format currency amount with proper symbol
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (INR, AED, USD, etc.)
 * @param {object} options - Additional options
 * @param {boolean} options.compact - Whether to use compact notation (Cr, Lac, K, M)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'INR', options = {}) => {
  if (amount === null || amount === undefined) return 'N/A';

  const { compact = true } = options;
  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  // Handle negative amounts
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  let formatted;

  if (compact) {
    // Use compact notation for large amounts
    if (currency === 'INR') {
      // Indian number system: Lakhs and Crores
      if (absAmount >= 10000000) {
        formatted = `${(absAmount / 10000000).toFixed(2)} Cr`;
      } else if (absAmount >= 100000) {
        formatted = `${(absAmount / 100000).toFixed(2)} Lac`;
      } else {
        formatted = absAmount.toLocaleString('en-IN');
      }
    } else if (currency === 'AED') {
      // For AED, always show full amount (no compact notation)
      formatted = absAmount.toLocaleString('en-US');
    } else {
      // Default international notation
      if (absAmount >= 1000000) {
        formatted = `${(absAmount / 1000000).toFixed(2)}M`;
      } else if (absAmount >= 1000) {
        formatted = `${(absAmount / 1000).toFixed(1)}K`;
      } else {
        formatted = absAmount.toLocaleString('en-US');
      }
    }
  } else {
    // Full number format
    formatted = absAmount.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US');
  }

  // Add symbol and handle negative
  const result = `${symbol} ${formatted}`;
  return isNegative ? `- ${result}` : result;
};

/**
 * Format currency for display in tables/lists
 * Shows symbol + amount with compact notation
 */
export const formatCurrencyCompact = (amount, currency = 'INR') => {
  return formatCurrency(amount, currency, { compact: true });
};

/**
 * Format currency for detailed view
 * Shows symbol + full amount
 */
export const formatCurrencyFull = (amount, currency = 'INR') => {
  return formatCurrency(amount, currency, { compact: false });
};

/**
 * Get currency symbol for a given currency code
 */
export const getCurrencySymbol = (currency = 'INR') => {
  return CURRENCY_SYMBOLS[currency] || currency;
};

/**
 * Currency code display names
 */
const CURRENCY_NAMES = {
  INR: 'Indian Rupee',
  AED: 'UAE Dirham',
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound'
};

/**
 * Get currency display name
 */
export const getCurrencyName = (currency = 'INR') => {
  return CURRENCY_NAMES[currency] || currency;
};

export default {
  formatCurrency,
  formatCurrencyCompact,
  formatCurrencyFull,
  getCurrencySymbol,
  getCurrencyName
};