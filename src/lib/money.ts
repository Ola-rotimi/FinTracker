/**
 * All amounts are stored as integer minor units (cents) to avoid floating-point drift.
 */

export const CURRENCIES = [
  // Africa
  'NGN', 'GHS', 'KES', 'ZAR', 'EGP', 'UGX', 'TZS', 'RWF', 'ETB', 'MAD', 'ZMW', 'BWP',
  'NAD', 'MUR', 'MWK', 'XOF', 'XAF',
  // Rest of the world
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'INR', 'JPY', 'CNY', 'CHF', 'SEK', 'NOK',
  'DKK', 'BRL', 'MXN', 'AED', 'SAR', 'SGD', 'HKD', 'PHP',
];

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, compact: boolean) {
  const key = `${currency}:${compact}`;
  let f = formatters.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        notation: compact ? 'compact' : 'standard',
        maximumFractionDigits: compact ? 1 : 2,
      });
    } catch {
      f = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
    }
    formatters.set(key, f);
  }
  return f;
}

export function formatMoney(cents: number, currency: string, opts: { compact?: boolean; sign?: boolean } = {}) {
  const value = cents / 100;
  const text = getFormatter(currency, !!opts.compact).format(Math.abs(value));
  if (value < 0) return `-${text}`;
  return opts.sign && value > 0 ? `+${text}` : text;
}

/** Format a plain (major unit) number such as calculator output. */
export function formatMajor(value: number, currency: string, compact = false) {
  return formatMoney(Math.round(value * 100), currency, { compact });
}

/** Parse user input like "1,234.50" into cents. Returns null for invalid input. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[,\s]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Parse a plain number field (calculators). */
export function parseNumber(text: string, fallback = 0): number {
  const n = Number(text.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(/\.00$/, '');
}

export function formatPercent(ratio: number, digits = 1) {
  if (!Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(digits)}%`;
}
