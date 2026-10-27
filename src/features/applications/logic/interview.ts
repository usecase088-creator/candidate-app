// Interview, documents, offer and joining: what each application shows and which answers are allowed
// (website: features/applications/CandidateActionCard.tsx; allowed moves: API.md §19).
import type { Application } from '@/api/schemas/applications';
import { isOpenableLink } from '@/features/jobs/logic/deadline';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The clock fields of a moment as seen in India (UTC+5:30, no daylight saving), whatever the phone's time zone is. */
function istParts(iso: string | null | undefined) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const d = new Date(t + IST_OFFSET_MS);
  return {
    day: d.getUTCDate(),
    month: MONTHS[d.getUTCMonth()],
    year: d.getUTCFullYear(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

const twelveHour = (h: number) => h % 12 || 12;
const ampm = (h: number) => (h < 12 ? 'am' : 'pm');
const pad = (n: number) => String(n).padStart(2, '0');

/** "30 Oct 2026, 7:30 pm" in India time (website: en-IN, Asia/Kolkata, medium date, short time). */
export function formatIstDateTime(iso: string | null | undefined): string {
  const p = istParts(iso);
  if (!p) return 'TBA';
  return `${p.day} ${p.month} ${p.year}, ${twelveHour(p.hour)}:${pad(p.minute)} ${ampm(p.hour)}`;
}

/** "25 Oct 2026" (applied on, joining date). Empty when there is no valid date. */
export function formatIndianDate(iso: string | null | undefined): string {
  const p = istParts(iso);
  return p ? `${p.day} ${p.month} ${p.year}` : '';
}

/** "02:05 pm", the time the list was fetched (phone's own clock, like the website). */
export function formatFetchedTime(date: Date): string {
  const h = date.getHours();
  return `${pad(twelveHour(h))}:${pad(date.getMinutes())} ${ampm(h)}`;
}

export type InterviewPlace =
  | { kind: 'link'; label: 'Link: '; url: string }
  | { kind: 'text'; label: 'Link: ' | 'Venue: '; text: string };

/** Virtual with a web link: a Join Meeting link. Everything else: the venue, or TBA (website). */
export function interviewPlace(a: Application): InterviewPlace {
  const virtual = a.interviewType === 'Virtual';
  if (virtual && a.meetingLink && isOpenableLink(a.meetingLink)) {
    return { kind: 'link', label: 'Link: ', url: a.meetingLink };
  }
  return { kind: 'text', label: virtual ? 'Link: ' : 'Venue: ', text: a.venue || 'TBA' };
}

export type ActionKind = 'interview' | 'documents' | 'documentsSubmitted' | 'offer' | 'joining';

/** Which card an application shows, if any. */
export function candidateAction(a: Application): ActionKind | null {
  if (a.status === 'InterviewScheduled') return 'interview';
  if (a.status === 'DocumentsRequested' || a.status === 'AdditionalDocumentsRequired') return 'documents';
  if (a.status === 'DocumentsUploaded') return 'documentsSubmitted';
  if (a.status === 'OfferSent') return 'offer';
  if (a.joiningDate && ['JoiningConfirmed', 'Joined', 'Onboarded'].includes(a.status)) return 'joining';
  return null;
}

const ALLOWED: Record<string, string[]> = {
  InterviewScheduled: ['InterviewAccepted', 'InterviewDeclined', 'RescheduleRequested'],
  DocumentsRequested: ['DocumentsUploaded'],
  AdditionalDocumentsRequired: ['DocumentsUploaded'],
  OfferSent: ['OfferAccepted', 'OfferRejected'],
};

/** The moves a candidate may make (the server checks them again). */
export function canRespond(from: string, to: string): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

/** Only a reschedule request needs the candidate's note. */
export function needsNote(status: string): boolean {
  return status === 'RescheduleRequested';
}
