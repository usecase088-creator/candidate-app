// Application rows shaped like GET /api/applications (recorded from the local backend, seeded demo applicant,
// 2026-10-27; docs/reference/API.md §17). Test data only. `application()` gives the full row; the presets match the
// states the backend seed creates, so screen tests and the contract tests talk about the same situations.

export const APPLICATION_JOB = {
  id: '5eed0000-0000-4000-8000-00000000e002',
  role: 'Emergency Physician',
  hospital: 'Seed City Multispeciality Hospital',
  hospitalId: '5eed0000-0000-4000-8000-00000000a001',
  hospitalLogoUrl: null,
  category: 'Archive',
  specialty: 'Emergency Medicine',
  city: 'Kolkata',
  location: 'Kolkata, West Bengal',
  type: 'Full-time',
  status: 'Closed',
  salaryMin: 4,
  salaryMax: 6,
  customApplicationFields: [],
};

const BASE = {
  id: '5eed0000-0000-4000-8000-00000000a101',
  status: 'Applied',
  appliedOn: '2026-10-25T14:03:43.538Z',
  cvSource: 'form',
  uploadedCvName: null,
  uploadedCvMime: null,
  uploadedCvData: null,
  customFieldResponses: {},
  cvCloudinaryId: null,
  cvUrl: null,
  supportingDocuments: [],
  interviewDate: null,
  interviewType: null,
  meetingLink: null,
  venue: null,
  interviewerName: null,
  interviewerEmail: null,
  interviewNotes: null,
  interviewRound: 1,
  interviewHistory: null,
  candidateResponseNote: null,
  interviewOutcomeNote: null,
  requestedDocumentList: [],
  documentRequestNote: null,
  offerLetterUrl: null,
  offerLetterCloudinaryId: null,
  joiningDate: null,
  joiningNote: null,
  finalStatusNote: null,
  isFlagged: false,
  reviewedAt: null,
  interviewScheduledAt: null,
  offerSentAt: null,
  joinedAt: null,
  updatedAt: '2026-10-27T14:03:55.038Z',
  jobId: APPLICATION_JOB.id,
  candidateId: '28ea70bd-c23e-4a72-b236-5aaf473baf66',
  job: APPLICATION_JOB,
  applicationDocuments: [],
  matchPercent: 75,
};

export type ApplicationFixture = typeof BASE & Record<string, unknown>;

/** One application row. `over` replaces any field; a new `jobId` or `job` keeps the two in step unless both are given. */
export function application(over: Record<string, unknown> = {}): ApplicationFixture {
  const row: Record<string, unknown> = { ...BASE, ...over };
  const job = (over.job as Record<string, unknown> | undefined) ?? undefined;
  if (job && !over.jobId) row.jobId = job.id;
  if (job) row.job = { ...APPLICATION_JOB, ...job };
  return row as ApplicationFixture;
}

const ID = (n: number) => `5eed0000-0000-4000-8000-00000000a10${n}`;
const jobOf = (
  n: number,
  role: string,
  hospital = 'Seed City Multispeciality Hospital',
  city = 'Kolkata',
) => ({
  id: `5eed0000-0000-4000-8000-00000000e00${n}`,
  role,
  hospital,
  city,
  location: `${city}, ${city === 'Kolkata' ? 'West Bengal' : 'Karnataka'}`,
});

export const applied = application({ id: ID(1), job: jobOf(1, 'ICU Nurse') });

export const interviewVirtual = application({
  id: ID(2),
  status: 'InterviewScheduled',
  appliedOn: '2026-10-21T14:03:43.538Z',
  reviewedAt: '2026-10-23T14:03:43.538Z',
  interviewScheduledAt: '2026-10-26T14:03:43.538Z',
  interviewDate: '2026-10-30T14:00:00.000Z',
  interviewType: 'Virtual',
  meetingLink: 'https://example.org/meet/seed-interview',
  interviewNotes: 'Please join five minutes early.',
  interviewerName: 'Dr. Seed Interviewer',
  interviewerEmail: 'interviewer@apronhanger.test',
  job: jobOf(2, 'Emergency Physician'),
});

export const interviewInPerson = application({
  id: ID(3),
  status: 'InterviewScheduled',
  appliedOn: '2026-10-20T14:03:43.538Z',
  interviewDate: '2026-11-01T04:30:00.000Z',
  interviewType: 'Physical',
  venue: 'Seed Valley Care Centre, 2nd floor, Bengaluru',
  interviewerName: 'Dr. Seed Interviewer',
  interviewerEmail: 'interviewer@apronhanger.test',
  job: jobOf(3, 'Pharmacist', 'Seed Valley Care Centre', 'Bengaluru'),
});

export const documentsRequested = application({
  id: ID(4),
  status: 'DocumentsRequested',
  appliedOn: '2026-10-18T14:03:43.538Z',
  requestedDocumentList: ['Medical registration certificate', 'Experience letter', 'Identity proof'],
  documentRequestNote: 'Please upload clear scans. PDF or photo, up to 5 MB each.',
  job: jobOf(4, 'Laboratory Technician', 'Seed Valley Care Centre', 'Bengaluru'),
});

export const documentsUploaded = application({
  id: ID(5),
  status: 'DocumentsUploaded',
  appliedOn: '2026-10-17T14:03:43.538Z',
  requestedDocumentList: ['Degree certificate'],
  applicationDocuments: [
    {
      id: '5eed0000-0000-4000-8000-00000000d101',
      applicationId: ID(5),
      name: 'Degree certificate',
      url: 'https://example.org/docs/degree-seed.pdf',
      cloudinaryId: 'seed/degree-seed',
      mime: 'application/pdf',
      uploadedAt: '2026-10-27T14:03:56.489Z',
      uploadedBy: 'CANDIDATE',
    },
  ],
  job: jobOf(5, 'Physiotherapist'),
});

export const offerSent = application({
  id: ID(6),
  status: 'OfferSent',
  appliedOn: '2026-10-13T14:03:43.538Z',
  offerSentAt: '2026-10-26T14:03:43.538Z',
  offerLetterUrl: 'https://example.org/offer-letter-seed.pdf',
  job: jobOf(6, 'Anaesthetist', 'Seed Valley Care Centre', 'Bengaluru'),
});

export const joiningConfirmed = application({
  id: ID(7),
  status: 'JoiningConfirmed',
  appliedOn: '2026-10-07T14:03:43.538Z',
  offerLetterUrl: 'https://example.org/offer-letter-seed.pdf',
  joiningDate: '2026-11-26T14:03:43.538Z',
  joiningNote: 'Report to HR at 9 am with your original certificates.',
  job: jobOf(7, 'Ward Nurse (Night)'),
});

export const rejected = application({
  id: ID(8),
  status: 'Rejected',
  appliedOn: '2026-10-15T14:03:43.538Z',
  finalStatusNote: 'The position has been filled.',
  job: jobOf(8, 'Radiologist', 'Seed Valley Care Centre', 'Bengaluru'),
});

/** The eight seeded rows, newest application first (the backend sorts by appliedOn desc). */
export const seededApplications: ApplicationFixture[] = [
  applied,
  interviewVirtual,
  interviewInPerson,
  documentsRequested,
  documentsUploaded,
  offerSent,
  joiningConfirmed,
  rejected,
].sort((a, b) => b.appliedOn.localeCompare(a.appliedOn));

/** The five job questions of the seeded Radiology Technician job (one of every type). */
export const jobQuestions = [
  {
    id: 'q_modality',
    label: 'Which imaging machines have you operated?',
    type: 'text',
    required: true,
    placeholder: 'e.g. 128-slice CT',
  },
  { id: 'q_notes', label: 'Anything else the hospital should know?', type: 'textarea', required: false },
  { id: 'q_scans', label: 'Scans you handle per day', type: 'number', required: true },
  {
    id: 'q_shift',
    label: 'Preferred shift',
    type: 'select',
    required: true,
    options: ['Morning', 'Evening', 'Night'],
  },
  { id: 'q_license', label: 'I hold a valid radiation safety certificate', type: 'checkbox', required: true },
];

/** A candidate row with a filled form profile (GET /api/candidates/me), the way the demo applicant looks. */
export const applicantMe = {
  id: '28ea70bd-c23e-4a72-b236-5aaf473baf66',
  name: 'Demo Applicant',
  email: 'applicant@apronhanger.test',
  phone: '9876500088',
  role: 'Clinical Practitioners & Super Specialists (MBBS/ MD Physician/ MD/MS / DM / MCh / DNB-SS etc)',
  experienceYears: 6,
  location: 'West Bengal',
  cvSource: 'form',
  cvUrl: null,
  avatarUrl: null,
  avatarCloudinaryId: null,
  uploadedCvName: null,
  uploadedCvData: null,
  profile: {
    name: 'Demo Applicant',
    headline: 'General Physician · 6 years experience',
    email: 'applicant@apronhanger.test',
    phone: '9876500088',
    city: 'Kolkata',
    state: 'West Bengal',
    verified: false,
    completeness: 94,
    role: 'Clinical Practitioners & Super Specialists (MBBS/ MD Physician/ MD/MS / DM / MCh / DNB-SS etc)',
    specialty: 'General Medicine',
    yearsExperience: 6,
    clinicalSkills: ['General Medicine', 'Emergency Care'],
    technicalSkills: ['ECG interpretation'],
    preferredLocations: ['Kolkata', 'Bengaluru'],
    languages: ['English', 'Bengali', 'Hindi'],
    // a key the app does not know: it must go back to the server untouched
    futureFlag: { keep: 'me' },
  },
};
