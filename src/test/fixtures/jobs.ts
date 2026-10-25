// Response bodies shaped like the backend's (../job/backend/src/lib/helpers.ts formatJob, govJobRoutes, intlJobRoutes).

/** One item of GET /api/jobs (seeded "Staff Nurse" job). */
export const publicJob = {
  id: '5eed0000-0000-4000-8000-00000000b001',
  role: 'Staff Nurse',
  category: 'Nurses',
  specialty: 'Nursing',
  subSpecialty: null,
  location: 'Kolkata, West Bengal',
  city: 'Kolkata',
  salaryMin: 3,
  salaryMax: 4.5,
  experienceMin: 1,
  experienceMax: 5,
  experience: null,
  type: 'Full-time',
  shift: 'Rotational',
  status: 'Active',
  closedReason: null,
  postedDays: 0,
  postedOn: '2026-10-25T10:00:00.000Z',
  createdAt: '2026-10-25T10:00:00.000Z',
  updatedAt: '2026-10-25T10:00:00.000Z',
  visibilityEndsAt: null,
  description: 'Staff nurse for the medical ward.',
  responsibilities: [],
  requirements: [],
  perks: [],
  tags: ['GNM', 'B.Sc Nursing'],
  isFlagged: false,
  customApplicationFields: [],
  hospitalId: '5eed0000-0000-4000-8000-00000000a001',
  hospital: 'Seed City Multispeciality Hospital',
  hospitalLogoUrl: null,
  hospitalVerified: true,
  hospitalAbout: 'Test hospital for local development.',
  postedById: '3097c596-478e-4770-a4e1-b028e7007de8',
  postedBy: {
    id: '3097c596-478e-4770-a4e1-b028e7007de8',
    name: 'Test Recruiter',
    email: 'recruiter@apronhanger.test',
  },
  applicants: 0,
  shortlisted: 0,
};

/** One item of GET /api/gov-jobs. */
export const govJob = {
  id: 'g1',
  examAuthority: 'AIIMS',
  name: 'Nursing Officer Recruitment',
  lastDate: '2026-11-30T00:00:00.000Z',
  link: 'https://example.gov.in/notice.pdf',
  createdAt: '2026-10-01T00:00:00.000Z',
};

/** One item of GET /api/intl-jobs. */
export const intlJob = {
  id: 'i1',
  jobPosition: 'Staff Nurse',
  specialty: 'ICU',
  city: 'London',
  country: 'United Kingdom',
  countryFlag: '🇬🇧',
  payscale: '£30k–£38k',
  experience: '2+ yrs',
  qualification: 'B.Sc Nursing',
  license: 'NMC',
  visaSponsorship: 'Sponsorship',
  applyLink: 'https://example.co.uk/apply',
  lastDate: null,
  createdAt: '2026-10-01T00:00:00.000Z',
};
