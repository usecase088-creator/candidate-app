/** Application statuses that are final — no further pipeline transitions. */
export const TERMINAL_APP_STATUSES = [
  'Onboarded',
  'Dropped',
  'OfferRejected',
  'DocumentsRejected',
  'Rejected',
  'InterviewDeclined',
  'JobClosed',
] as const;
