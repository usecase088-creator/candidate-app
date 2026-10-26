// Gov and international listings: deadline text and colours (../job/candidates/src/routes/gov-jobs.tsx, foreign-jobs.tsx).

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysLeft(date: string, now = Date.now()): number {
  return Math.ceil((new Date(date).getTime() - now) / DAY_MS);
}

export function isExpired(date: string, now = Date.now()): boolean {
  return new Date(date).getTime() < now;
}

export type DeadlineKind = 'none' | 'open' | 'soon' | 'expired';
export type DeadlineInfo = { kind: DeadlineKind; text: string; badge: string | null };

/** `soon` = 7 days or fewer (amber, with "{n}d left"); `expired` is red and its link is disabled. */
export function deadlineInfo(lastDate: string | null | undefined, now = Date.now()): DeadlineInfo {
  if (!lastDate) return { kind: 'none', text: 'No deadline', badge: null };
  if (isExpired(lastDate, now))
    return { kind: 'expired', text: `Expired · ${formatDate(lastDate)}`, badge: null };
  const left = daysLeft(lastDate, now);
  if (left <= 7) return { kind: 'soon', text: formatDate(lastDate), badge: `${left}d left` };
  return { kind: 'open', text: formatDate(lastDate), badge: null };
}

/** Links come from the database (admin-entered): only web links are handed to the in-app browser. */
export function isOpenableLink(url: string): boolean {
  return /^https?:\/\//i.test(url);
}
