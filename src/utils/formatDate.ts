/**
 * Dates are stored as ISO `YYYY-MM-DD` (sometimes with a trailing time part).
 * Every customer document and report renders them as Day/Month/Year.
 */
export function formatDate(value?: string | Date | null): string {
  if (!value) return '';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return toDdMmYyyy(value.getDate(), value.getMonth() + 1, value.getFullYear());
  }

  const raw = String(value).trim();
  if (!raw) return '';

  // Fast path for the stored format: "2026-07-26" or "2026-07-26 17:30"
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

  // Already Day/Month/Year — leave it alone
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return toDdMmYyyy(parsed.getDate(), parsed.getMonth() + 1, parsed.getFullYear());
}

/** Day/Month/Year plus the time part when the stored value carries one. */
export function formatDateTime(value?: string | null): string {
  if (!value) return '';
  const raw = String(value).trim();
  const date = formatDate(raw);
  const time = raw.match(/(\d{2}:\d{2})/);
  return time ? `${date} ${time[1]}` : date;
}

function toDdMmYyyy(day: number, month: number, year: number): string {
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}
