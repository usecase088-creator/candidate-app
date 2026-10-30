/**
 * A date as the website reads it (date-fns parseISO in candidates/src/lib/validations.ts and DatePickerField): YYYY-MM-DD,
 * and also the shorter YYYY-MM and YYYY (first of the month / year) or an ISO timestamp, which profiles saved on the
 * website can hold. Returns that local day at midnight, or null.
 */
export function parseWebsiteDate(raw: string): Date | null {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2})(?:T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?)?)?$/.exec(raw.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) - 1 : 0;
  const day = m[3] ? Number(m[3]) : 1;
  const d = new Date(year, month, day);
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day ? d : null;
}
