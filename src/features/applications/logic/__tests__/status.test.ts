import {
  ALL_STATUSES,
  countByTab,
  inTab,
  isTerminalStatus,
  lastUpdateText,
  sortNewestFirst,
  statusLabel,
  statusTone,
  TABS,
  TIMELINE_STEPS,
  timelineStep,
  timelineView,
} from '../status';

describe('statusLabel (website: lib/applicationStatus.ts)', () => {
  it('has the 26 statuses with the exact website labels', () => {
    expect(ALL_STATUSES).toHaveLength(26);
    expect(ALL_STATUSES.map(statusLabel)).toEqual([
      'Applied',
      'Reviewed',
      'Interview Scheduled',
      'Interview Accepted',
      'Interview Declined',
      'Reschedule Requested',
      'Interview Completed',
      'No Show',
      'Interview Rescheduled',
      'Shortlisted',
      'On Hold',
      'Next Round',
      'Rejected',
      'Documents Requested',
      'Documents Uploaded',
      'Documents Approved',
      'Additional Docs Required',
      'Documents Rejected',
      'Offer Sent',
      'Offer Accepted',
      'Offer Rejected',
      'Joining Confirmed',
      'Joined',
      'Onboarded',
      'Dropped',
      'Job Closed',
    ]);
  });

  it('maps the old statuses: New is Applied, Contacted is Offer Sent', () => {
    expect(statusLabel('New')).toBe('Applied');
    expect(statusLabel('Contacted')).toBe('Offer Sent');
  });

  it('shows an unknown status as the backend wrote it (never blank)', () => {
    expect(statusLabel('SomethingNew')).toBe('SomethingNew');
  });
});

describe('tabs', () => {
  it('are the nine of the website, in order', () => {
    expect(TABS).toEqual([
      'All',
      'Applied',
      'Reviewed',
      'Interview Scheduled',
      'Shortlisted',
      'Documents Requested',
      'Offer Sent',
      'Rejected',
      'Joined',
    ]);
  });

  it('match on the display label: Interview Accepted is in no tab but All', () => {
    expect(inTab('InterviewScheduled', 'Interview Scheduled')).toBe(true);
    expect(inTab('InterviewAccepted', 'Interview Scheduled')).toBe(false);
    expect(inTab('InterviewAccepted', 'All')).toBe(true);
    expect(TABS.filter((t) => t !== 'All' && inTab('InterviewAccepted', t))).toEqual([]);
  });

  it('count the old statuses under their new labels', () => {
    const rows = [{ status: 'New' }, { status: 'Applied' }, { status: 'Contacted' }, { status: 'Rejected' }];
    expect(countByTab(rows)).toMatchObject({ All: 4, Applied: 2, 'Offer Sent': 1, Rejected: 1, Joined: 0 });
  });
});

describe('statusTone: the pill colour group', () => {
  it.each([
    ['Rejected', 'danger'],
    ['Dropped', 'danger'],
    ['OfferRejected', 'danger'],
    ['InterviewDeclined', 'danger'],
    ['DocumentsRejected', 'danger'],
    ['JobClosed', 'danger'],
    ['InterviewScheduled', 'interview'],
    ['InterviewAccepted', 'interview'],
    ['RescheduleRequested', 'interview'],
    ['InterviewRescheduled', 'interview'],
    ['DocumentsRequested', 'document'],
    ['DocumentsUploaded', 'document'],
    ['AdditionalDocumentsRequired', 'document'],
    ['OfferSent', 'positive'],
    ['OfferAccepted', 'positive'],
    ['JoiningConfirmed', 'positive'],
    ['Joined', 'positive'],
    ['Shortlisted', 'positive'],
    ['Onboarded', 'positive'],
    ['Reviewed', 'reviewed'],
    ['Applied', 'applied'],
    ['New', 'applied'],
    ['NoShow', 'muted'],
    ['OnHold', 'muted'],
    ['NextRound', 'muted'],
  ])('%s is %s', (status, tone) => {
    expect(statusTone(status)).toBe(tone);
  });

  it('a rejected offer or a closed job is red, not green (the website colours them by their label and gets it wrong)', () => {
    expect(statusTone('OfferRejected')).toBe('danger');
    expect(statusTone('JobClosed')).toBe('danger');
  });
});

describe('isTerminalStatus', () => {
  it("lists the website's seven closed states", () => {
    for (const s of [
      'Onboarded',
      'Dropped',
      'OfferRejected',
      'DocumentsRejected',
      'Rejected',
      'InterviewDeclined',
      'JobClosed',
    ]) {
      expect(isTerminalStatus(s)).toBe(true);
    }
    expect(isTerminalStatus('OfferSent')).toBe(false);
  });
});

describe('timeline', () => {
  it('has the five steps of the website', () => {
    expect(TIMELINE_STEPS).toEqual(['Applied', 'Reviewed', 'Interview', 'Documents', 'Offer & Joining']);
  });

  it.each([
    ['Applied', 0],
    ['New', 0],
    ['Reviewed', 1],
    ['InterviewScheduled', 2],
    ['RescheduleRequested', 2],
    ['NoShow', 2],
    ['Shortlisted', 2],
    ['OnHold', 2],
    ['NextRound', 2],
    ['DocumentsRequested', 3],
    ['DocumentsUploaded', 3],
    ['OfferSent', 4],
    ['JoiningConfirmed', 4],
    ['Onboarded', 4],
    ['Dropped', 1],
  ])('%s is at step %i', (status, step) => {
    expect(timelineStep(status)).toBe(step);
  });

  it('a rejection shows "Application closed by recruiter" instead of the steps', () => {
    expect(timelineView('Rejected')).toEqual({
      kind: 'message',
      tone: 'danger',
      text: 'Application closed by recruiter',
    });
  });

  it('a closed job shows the closed message (the website meant to, but compares with the wrong label)', () => {
    expect(timelineView('JobClosed')).toEqual({
      kind: 'message',
      tone: 'muted',
      text: 'This job posting has been closed. You are no longer in the active pipeline for this role.',
    });
  });

  it('everything else shows the steps and the current one', () => {
    expect(timelineView('OfferSent')).toEqual({ kind: 'steps', current: 4 });
  });
});

describe('lastUpdateText', () => {
  it('uses the website sentences', () => {
    expect(lastUpdateText('JobClosed')).toBe('This job posting has been closed by the recruiter');
    expect(lastUpdateText('Applied')).toBe('Application received by hospital');
    expect(lastUpdateText('New')).toBe('Application received by hospital');
    expect(lastUpdateText('OfferSent')).toBe('Status updated to Offer Sent');
    expect(lastUpdateText('Contacted')).toBe('Status updated to Offer Sent');
  });
});

describe('sortNewestFirst', () => {
  it('orders by applied date, newest first, without changing the input', () => {
    const rows = [
      { id: 'a', appliedOn: '2026-10-01T00:00:00.000Z' },
      { id: 'b', appliedOn: '2026-10-20T00:00:00.000Z' },
      { id: 'c', appliedOn: null },
    ];
    expect(sortNewestFirst(rows).map((r) => r.id)).toEqual(['b', 'a', 'c']);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});
