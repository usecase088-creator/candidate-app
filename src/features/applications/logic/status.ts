// Statuses, tabs, pill colours and the timeline (website: lib/applicationStatus.ts, routes/applications.tsx).
// Wording is the website's. Two places where the website's own code misses its intent are fixed on purpose (D27):
// closed states are red whatever their label, and a closed job shows its closed message.

export const ALL_STATUSES = [
  'Applied',
  'Reviewed',
  'InterviewScheduled',
  'InterviewAccepted',
  'InterviewDeclined',
  'RescheduleRequested',
  'InterviewCompleted',
  'NoShow',
  'InterviewRescheduled',
  'Shortlisted',
  'OnHold',
  'NextRound',
  'Rejected',
  'DocumentsRequested',
  'DocumentsUploaded',
  'DocumentsApproved',
  'AdditionalDocumentsRequired',
  'DocumentsRejected',
  'OfferSent',
  'OfferAccepted',
  'OfferRejected',
  'JoiningConfirmed',
  'Joined',
  'Onboarded',
  'Dropped',
  'JobClosed',
] as const;

const LABELS: Record<string, string> = {
  Applied: 'Applied',
  Reviewed: 'Reviewed',
  InterviewScheduled: 'Interview Scheduled',
  InterviewAccepted: 'Interview Accepted',
  InterviewDeclined: 'Interview Declined',
  RescheduleRequested: 'Reschedule Requested',
  InterviewCompleted: 'Interview Completed',
  NoShow: 'No Show',
  InterviewRescheduled: 'Interview Rescheduled',
  Shortlisted: 'Shortlisted',
  OnHold: 'On Hold',
  NextRound: 'Next Round',
  Rejected: 'Rejected',
  DocumentsRequested: 'Documents Requested',
  DocumentsUploaded: 'Documents Uploaded',
  DocumentsApproved: 'Documents Approved',
  AdditionalDocumentsRequired: 'Additional Docs Required',
  DocumentsRejected: 'Documents Rejected',
  OfferSent: 'Offer Sent',
  OfferAccepted: 'Offer Accepted',
  OfferRejected: 'Offer Rejected',
  JoiningConfirmed: 'Joining Confirmed',
  Joined: 'Joined',
  Onboarded: 'Onboarded',
  Dropped: 'Dropped',
  JobClosed: 'Job Closed',
};

/** The label the candidate sees. Old statuses are mapped; an unknown one is shown as the backend wrote it. */
export function statusLabel(status: string): string {
  if (status === 'New') return 'Applied';
  if (status === 'Contacted') return 'Offer Sent';
  return LABELS[status] ?? status;
}

export const TABS = [
  'All',
  'Applied',
  'Reviewed',
  'Interview Scheduled',
  'Shortlisted',
  'Documents Requested',
  'Offer Sent',
  'Rejected',
  'Joined',
] as const;

export type Tab = (typeof TABS)[number];

/** Tabs match the display label, not the stored status (website). */
export function inTab(status: string, tab: Tab): boolean {
  return tab === 'All' || statusLabel(status) === tab;
}

export function countByTab(rows: { status: string }[]): Record<Tab, number> {
  const counts = {} as Record<Tab, number>;
  for (const tab of TABS) counts[tab] = rows.filter((r) => inTab(r.status, tab)).length;
  return counts;
}

const TERMINAL = new Set([
  'Onboarded',
  'Dropped',
  'OfferRejected',
  'DocumentsRejected',
  'Rejected',
  'InterviewDeclined',
  'JobClosed',
]);

export function isTerminalStatus(status: string): boolean {
  return TERMINAL.has(status);
}

export type StatusTone = 'danger' | 'interview' | 'document' | 'positive' | 'reviewed' | 'applied' | 'muted';

/** Pill colour group: closed = red (not Onboarded), interview = indigo, documents = amber, offer and joining = green. */
export function statusTone(status: string): StatusTone {
  // The label and the stored name are both checked: "Additional Docs Required" has no "document" in its label.
  const label = `${statusLabel(status)} ${status}`.toLowerCase();
  if (isTerminalStatus(status) && status !== 'Onboarded') return 'danger';
  if (label.includes('interview') || label.includes('reschedule')) return 'interview';
  if (label.includes('document')) return 'document';
  const own = statusLabel(status).toLowerCase();
  if (label.includes('offer') || label.includes('join') || own === 'shortlisted' || own === 'onboarded') {
    return 'positive';
  }
  if (own === 'reviewed') return 'reviewed';
  if (own === 'applied') return 'applied';
  return 'muted';
}

export const TIMELINE_STEPS = ['Applied', 'Reviewed', 'Interview', 'Documents', 'Offer & Joining'] as const;

/** Which of the five steps the application has reached (a rejection or a drop shows step 2, like the website). */
export function timelineStep(status: string): number {
  if (status === 'Applied' || status === 'New') return 0;
  if (status === 'Reviewed') return 1;
  if (
    status.includes('Interview') ||
    status.includes('Reschedule') ||
    status === 'NoShow' ||
    status === 'Shortlisted' ||
    status === 'OnHold' ||
    status === 'NextRound'
  ) {
    return 2;
  }
  if (status.includes('Document')) return 3;
  if (status.includes('Offer') || status.includes('Join') || status === 'Onboarded') return 4;
  return 1;
}

export type TimelineView =
  { kind: 'steps'; current: number } | { kind: 'message'; tone: 'danger' | 'muted'; text: string };

export function timelineView(status: string): TimelineView {
  if (status === 'JobClosed') {
    return {
      kind: 'message',
      tone: 'muted',
      text: 'This job posting has been closed. You are no longer in the active pipeline for this role.',
    };
  }
  if (status === 'Rejected')
    return { kind: 'message', tone: 'danger', text: 'Application closed by recruiter' };
  return { kind: 'steps', current: timelineStep(status) };
}

export function lastUpdateText(status: string): string {
  if (status === 'JobClosed') return 'This job posting has been closed by the recruiter';
  if (status === 'New' || status === 'Applied') return 'Application received by hospital';
  return `Status updated to ${statusLabel(status)}`;
}

/** Newest first by applied date; rows without a date go last. The input is not changed. */
export function sortNewestFirst<T extends { appliedOn?: string | null }>(rows: T[]): T[] {
  const time = (r: T) => (r.appliedOn ? Date.parse(r.appliedOn) : Number.NEGATIVE_INFINITY);
  return [...rows].sort((a, b) => time(b) - time(a));
}
