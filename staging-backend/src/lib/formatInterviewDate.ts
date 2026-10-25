/** Format interview date/time for India (IST) display in notifications and UI copy. */
export function formatInterviewDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
