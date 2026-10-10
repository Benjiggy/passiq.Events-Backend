/**
 * Data and Currency Formatters
 */
const toKobo = (amountNaira) => {
  const parsed = typeof amountNaira === 'string' ? parseFloat(amountNaira.replace(/[^\d.]/g, '')) : Number(amountNaira);
  if (isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
};

const toNaira = (amountKobo) => {
  const parsed = Number(amountKobo);
  if (isNaN(parsed) || parsed < 0) return 0;
  return parsed / 100;
};

const formatCurrency = (amount, currency = 'NGN') => {
  const numeric = typeof amount === 'number' ? amount : Number(amount || 0);
  const symbol = {
    NGN: '₦',
    USD: '$',
    GBP: '£',
    EUR: '€',
    GHS: 'GH₵',
    KES: 'KSh',
    ZAR: 'R',
    USDT: 'USDT ',
    USDC: 'USDC ',
    BTC: '₿ ',
    ETH: 'Ξ ',
    SOL: '◎ '
  }[currency] || `${currency} `;

  return `${symbol}${numeric.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const generateTicketCode = (eventId, index = 1) => {
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const prefix = (eventId || 'PASSIQ').toString().replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  return `${prefix}-${Date.now().toString(36).slice(-4).toUpperCase()}-${randomSuffix}`;
};

const generateReference = (prefix = 'PASSIQ') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
};

module.exports = {
  toKobo,
  toNaira,
  formatCurrency,
  generateTicketCode,
  generateReference
};
