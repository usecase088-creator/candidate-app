import type { SymbolViewProps } from 'expo-symbols';

export type NotificationKind = 'interview' | 'documents' | 'offer' | 'application' | 'other';

/** The server sends no type (API.md §25): the leading icon is chosen from the title first, then the link. */
export function notificationKind(n: {
  title: string;
  message: string;
  link?: string | null;
}): NotificationKind {
  const title = n.title.toLowerCase();
  if (title.includes('interview')) return 'interview';
  if (title.includes('document') || title.includes('upload') || title.includes(' cv')) return 'documents';
  if (title.includes('offer')) return 'offer';
  if (title.includes('application') || title.includes('shortlist')) return 'application';
  if (n.link?.startsWith('/applications')) return 'application';
  return 'other';
}

export const NOTIFICATION_ICONS: Record<NotificationKind, SymbolViewProps['name']> = {
  interview: { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' },
  documents: { ios: 'doc.text', android: 'description', web: 'description' },
  offer: { ios: 'checkmark.seal', android: 'verified', web: 'verified' },
  application: { ios: 'briefcase', android: 'work', web: 'work' },
  other: { ios: 'bell', android: 'notifications', web: 'notifications' },
};
