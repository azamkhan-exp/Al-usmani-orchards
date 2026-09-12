/**
 * Safe, Defensive Formatters for Al Usmani Orchards Platform.
 * 
 * Prevents runtime TypeErrors (such as "Cannot read properties of undefined (reading 'toLocaleString')")
 * and guarantees clean presentation without "PKR NaN", "PKR undefined", or "PKR null".
 */

/**
 * Safely formats any numeric or pseudo-numeric value as Pakistani Rupees (PKR).
 * 
 * Examples:
 * - formatPKR(4500) => "PKR 4,500"
 * - formatPKR("4500") => "PKR 4,500"
 * - formatPKR(null) => "Price unavailable"
 * - formatPKR(undefined) => "Price unavailable"
 * - formatPKR(NaN) => "Price unavailable"
 */
export function formatPKR(value: unknown, fallback = 'Price unavailable'): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const num = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(num) || isNaN(num)) {
    return fallback;
  }

  // Handle integers vs decimals cleanly
  const formatted = Number.isInteger(num)
    ? num.toLocaleString('en-PK')
    : num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `PKR ${formatted}`;
}

/**
 * Formats large amounts compactly (e.g. for charts and KPI cards).
 * Example: formatPKRCompact(150000) => "PKR 150k"
 */
export function formatPKRCompact(value: unknown, fallback = 'PKR 0'): string {
  if (value === null || value === undefined || value === '') return fallback;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || isNaN(num)) return fallback;

  if (Math.abs(num) >= 1_000_000) {
    return `PKR ${(num / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(num) >= 1_000) {
    return `PKR ${(num / 1_000).toFixed(0)}k`;
  }
  return `PKR ${num.toLocaleString('en-PK')}`;
}

/**
 * Safely formats inventory stock count.
 * 
 * Examples:
 * - formatStock(42) => "42 crates"
 * - formatStock(0) => "Out of stock"
 * - formatStock(null) => "Stock unavailable"
 */
export function formatStock(value: unknown, unit = 'crates'): string {
  if (value === null || value === undefined || value === '') {
    return 'Stock unavailable';
  }

  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || isNaN(num)) {
    return 'Stock unavailable';
  }

  if (num <= 0) {
    return 'Out of stock';
  }

  return `${num.toLocaleString('en-PK')} ${unit}`;
}

/**
 * Safely formats product package weight in kilograms.
 * Example: formatWeight(5) => "5 KG"
 */
export function formatWeight(value: unknown, fallback = 'N/A'): string {
  if (value === null || value === undefined || value === '') return fallback;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || isNaN(num) || num <= 0) return fallback;

  return `${num} KG`;
}

/**
 * Safely formats numbers for general count metrics.
 * Example: formatNumber(1250) => "1,250"
 */
export function formatNumber(value: unknown, fallback = '0'): string {
  if (value === null || value === undefined || value === '') return fallback;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || isNaN(num)) return fallback;

  return num.toLocaleString('en-PK');
}

/**
 * Safely formats a date or ISO string into human-readable format without throwing.
 */
export function formatDate(
  value: unknown,
  format: 'short' | 'long' | 'time' | 'full' = 'short',
  fallback = 'N/A'
): string {
  if (!value) return fallback;
  try {
    const d = value instanceof Date ? value : new Date(String(value));
    if (isNaN(d.getTime())) return fallback;

    if (format === 'time') {
      return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
    }
    if (format === 'long') {
      return d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (format === 'full') {
      return d.toLocaleString('en-PK', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return d.toISOString().split('T')[0];
  } catch {
    return fallback;
  }
}
