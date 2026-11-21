const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * D32 notification time: "Just now", "5m ago", "3h ago", "Yesterday", "3d ago" up to a week, then "6 Nov"
 * (with the year when it is not this year). Empty for a date that cannot be read.
 */
export function relativeTime(iso: string, now: Date = new Date(Date.now())): string {
  const d = new Date(iso);
  const t = d.getTime();
  if (Number.isNaN(t)) return '';
  const diff = now.getTime() - t;
  if (diff < MINUTE) return 'Just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  const days = Math.floor(diff / DAY);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
