/**
 * Safely parse a date value that may be:
 * - ISO 8601 string (e.g., "2026-03-05T12:00:00Z")
 * - Epoch millisecond string (e.g., "1770268420503")
 * - Epoch millisecond number (e.g., 1770268420503)
 * - SQLite datetime string (e.g., "2026-03-05 12:00:00")
 *
 * Returns a valid Date or falls back to current time.
 */
export function safeDate(value: string | number | undefined | null): Date {
  if (!value) return new Date();

  // If it's a number, treat as epoch ms
  if (typeof value === 'number') return new Date(value);

  // If the string is purely numeric, parse as epoch ms
  const n = Number(value);
  if (!isNaN(n) && String(n) === value.trim()) return new Date(n);

  // Try ISO / SQLite parse (add 'T' for SQLite format "YYYY-MM-DD HH:MM:SS")
  const normalized = value.includes(' ') && !value.includes('T')
    ? value.replace(' ', 'T')
    : value;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date() : d;
}
