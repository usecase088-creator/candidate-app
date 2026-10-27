import {
  application,
  documentsRequested,
  documentsUploaded,
  interviewInPerson,
  interviewVirtual,
  joiningConfirmed,
  offerSent,
} from '@/test/fixtures/applications';
import { ApplicationSchema } from '@/api/schemas/applications';

import {
  candidateAction,
  canRespond,
  formatFetchedTime,
  formatIndianDate,
  formatIstDateTime,
  interviewPlace,
  needsNote,
} from '../interview';

const parse = (a: unknown) => ApplicationSchema.parse(a);

describe('formatIstDateTime (website: toLocaleString en-IN, Asia/Kolkata, medium date + short time)', () => {
  it("shows India time whatever the phone's time zone is", () => {
    expect(formatIstDateTime('2026-10-30T14:00:00.000Z')).toBe('30 Oct 2026, 7:30 pm');
    expect(formatIstDateTime('2026-11-01T04:30:00.000Z')).toBe('1 Nov 2026, 10:00 am');
  });

  it('crosses midnight in India: 19:00 UTC is 12:30 am the next day', () => {
    expect(formatIstDateTime('2026-12-31T19:00:00.000Z')).toBe('1 Jan 2027, 12:30 am');
  });

  it('noon and midnight read 12 pm and 12 am', () => {
    expect(formatIstDateTime('2026-10-30T06:30:00.000Z')).toBe('30 Oct 2026, 12:00 pm');
    expect(formatIstDateTime('2026-10-29T18:30:00.000Z')).toBe('30 Oct 2026, 12:00 am');
  });

  it('a missing or broken date reads TBA, never "Invalid Date"', () => {
    expect(formatIstDateTime(null)).toBe('TBA');
    expect(formatIstDateTime(undefined)).toBe('TBA');
    expect(formatIstDateTime('not a date')).toBe('TBA');
  });
});

describe('formatIndianDate (applied on, joining date: d MMM yyyy)', () => {
  it('formats in India time', () => {
    expect(formatIndianDate('2026-10-25T14:03:43.538Z')).toBe('25 Oct 2026');
    expect(formatIndianDate('2026-11-26T14:03:43.538Z')).toBe('26 Nov 2026');
    expect(formatIndianDate('2026-10-25T19:00:00.000Z')).toBe('26 Oct 2026');
  });

  it('is empty for a missing or broken date', () => {
    expect(formatIndianDate(null)).toBe('');
    expect(formatIndianDate('nope')).toBe('');
  });
});

describe('formatFetchedTime (hh:mm am/pm on the phone)', () => {
  it('pads the hour like the website', () => {
    expect(formatFetchedTime(new Date(2026, 9, 27, 14, 5))).toBe('02:05 pm');
    expect(formatFetchedTime(new Date(2026, 9, 27, 0, 7))).toBe('12:07 am');
    expect(formatFetchedTime(new Date(2026, 9, 27, 12, 0))).toBe('12:00 pm');
    expect(formatFetchedTime(new Date(2026, 9, 27, 9, 30))).toBe('09:30 am');
  });
});

describe('interviewPlace', () => {
  it('virtual with a web link: a Join Meeting link', () => {
    expect(interviewPlace(parse(interviewVirtual))).toEqual({
      kind: 'link',
      label: 'Link: ',
      url: 'https://example.org/meet/seed-interview',
    });
  });

  it('in person: the venue', () => {
    expect(interviewPlace(parse(interviewInPerson))).toEqual({
      kind: 'text',
      label: 'Venue: ',
      text: 'Seed Valley Care Centre, 2nd floor, Bengaluru',
    });
  });

  it('no venue: TBA', () => {
    expect(
      interviewPlace(parse(application({ status: 'InterviewScheduled', interviewType: 'Physical' }))),
    ).toEqual({
      kind: 'text',
      label: 'Venue: ',
      text: 'TBA',
    });
  });

  it('virtual without a link falls back to the venue line, like the website', () => {
    expect(interviewPlace(parse({ ...interviewVirtual, meetingLink: null }))).toMatchObject({
      kind: 'text',
      text: 'TBA',
    });
  });

  it('a link that is not http(s) is never offered', () => {
    expect(interviewPlace(parse({ ...interviewVirtual, meetingLink: 'javascript:alert(1)' }))).toMatchObject({
      kind: 'text',
    });
    expect(
      interviewPlace(parse({ ...interviewVirtual, meetingLink: 'intent://x#Intent;end' })),
    ).toMatchObject({ kind: 'text' });
  });
});

describe('candidateAction: which card an application shows', () => {
  it.each([
    [interviewVirtual, 'interview'],
    [interviewInPerson, 'interview'],
    [documentsRequested, 'documents'],
    [application({ status: 'AdditionalDocumentsRequired' }), 'documents'],
    [documentsUploaded, 'documentsSubmitted'],
    [offerSent, 'offer'],
    [joiningConfirmed, 'joining'],
    [application({ status: 'Joined', joiningDate: '2026-11-26T00:00:00.000Z' }), 'joining'],
    [application({ status: 'Onboarded', joiningDate: '2026-11-26T00:00:00.000Z' }), 'joining'],
  ])('%#: %s', (row, kind) => {
    expect(candidateAction(parse(row))).toBe(kind);
  });

  it('no card for the rest, and none for joining without a joining date', () => {
    expect(candidateAction(parse(application({ status: 'Applied' })))).toBeNull();
    expect(candidateAction(parse(application({ status: 'Rejected' })))).toBeNull();
    expect(candidateAction(parse(application({ status: 'InterviewAccepted' })))).toBeNull();
    expect(candidateAction(parse(application({ status: 'JoiningConfirmed', joiningDate: null })))).toBeNull();
  });
});

describe('canRespond: the moves a candidate may make (API.md §19)', () => {
  it('interview: accept, decline, request a reschedule', () => {
    for (const next of ['InterviewAccepted', 'InterviewDeclined', 'RescheduleRequested']) {
      expect(canRespond('InterviewScheduled', next)).toBe(true);
    }
    expect(canRespond('InterviewScheduled', 'OfferAccepted')).toBe(false);
  });

  it('documents: uploaded', () => {
    expect(canRespond('DocumentsRequested', 'DocumentsUploaded')).toBe(true);
    expect(canRespond('AdditionalDocumentsRequired', 'DocumentsUploaded')).toBe(true);
    expect(canRespond('DocumentsUploaded', 'DocumentsUploaded')).toBe(false);
  });

  it('offer: accept or reject; nothing after', () => {
    expect(canRespond('OfferSent', 'OfferAccepted')).toBe(true);
    expect(canRespond('OfferSent', 'OfferRejected')).toBe(true);
    expect(canRespond('OfferAccepted', 'OfferRejected')).toBe(false);
  });

  it('only a reschedule request needs a note', () => {
    expect(needsNote('RescheduleRequested')).toBe(true);
    expect(needsNote('InterviewAccepted')).toBe(false);
    expect(needsNote('OfferRejected')).toBe(false);
  });
});
