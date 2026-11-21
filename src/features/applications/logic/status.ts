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

/** D32: the pill colour says what the status needs, not which stage it is (amends D27 item 4). */
export type StatusTone = 'warning' | 'info' | 'success' | 'error' | 'neutral';

const NEEDS_CANDIDATE = new Set([
  'Interview Scheduled',
  'Documents Requested',
  'Additional Docs Required',
  'Offer Sent',
]);
const DONE = new Set(['Joining Confirmed', 'Joined', 'Onboarded']);

/** True for the states a candidate has to answer (interview invitation, documents asked for, offer received). */
export function needsCandidate(status: string): boolean {
  return NEEDS_CANDIDATE.has(statusLabel(status));
}

/**
 * amber (warning) = needs you, blue (info) = waiting on the hospital, green (success) = done,
 * red (error) = closed; a status the app does not know is neutral.
 */
export function statusTone(status: string): StatusTone {
  const label = statusLabel(status);
  if (isTerminalStatus(status) && status !== 'Onboarded') return 'error';
  if (NEEDS_CANDIDATE.has(label)) return 'warning';
  if (DONE.has(label)) return 'success';
  const known = status in LABELS || status === 'New' || status === 'Contacted';
  return known ? 'info' : 'neutral';
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

/** "Step 3 of 5": the bar caption. The stage name is left to the status pill next to it (D32 round 2). */
export function stepLabel(current: number): string {
  return `Step ${current + 1} of ${TIMELINE_STEPS.length}`;
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

/**
 * The last-update line of a list card, only when it adds something to the pill (D32 round 2): "Status updated to X"
 * under an X pill is dropped, and so is the closed sentence the progress line already says.
 */
export function cardUpdateText(status: string): string | undefined {
  if (timelineView(status).kind === 'message') return undefined;
  const text = lastUpdateText(status);
  return text === `Status updated to ${statusLabel(status)}` ? undefined : text;
}

/** Newest first by applied date; rows without a date go last. The input is not changed. */
export function sortNewestFirst<T extends { appliedOn?: string | null }>(rows: T[]): T[] {
  const time = (r: T) => (r.appliedOn ? Date.parse(r.appliedOn) : Number.NEGATIVE_INFINITY);
  return [...rows].sort((a, b) => time(b) - time(a));
}
