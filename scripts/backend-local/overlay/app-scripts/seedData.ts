// Seed data for the local backend (dev Neon database only, D13). Pure: no Prisma here, so it is unit-tested
// in the app repo. app-scripts/seedApp.ts writes it with upserts, so running the seed again is safe.

type Env = Record<string, string | undefined>;

export const SEED_PASSWORD = 'Test@1234';
export const SEED_CANDIDATE_EMAIL = 'candidate@apronhanger.test';
export const SEED_RECRUITER_EMAIL = 'recruiter@apronhanger.test';

const YEAR_MS = 366 * 24 * 60 * 60 * 1000;

const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

type SeedApplication = {
  id: string;
  jobId: string;
  status: string;
  appliedOn: Date;
  reviewedAt?: Date;
  interviewScheduledAt?: Date;
  interviewDate?: Date;
  interviewType?: string;
  meetingLink?: string;
  venue?: string;
  interviewNotes?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  interviewRound?: number;
  requestedDocumentList?: string[];
  documentRequestNote?: string;
  offerSentAt?: Date;
  offerLetterUrl?: string;
  joiningDate?: Date;
  joiningNote?: string;
  finalStatusNote?: string;
};

/** The website's rule (`candidates/src/data/profile.ts` computeCompleteness): 17 checks, rounded percent. */
function computeCompleteness(p: {
  name: string;
  email: string;
  phone: string;
  state: string;
  city: string;
  registrationNumber: string;
  specialty: string;
  grade: string;
  licenseStatus: string;
  summary: string;
  qualifications: unknown[];
  experience: unknown[];
  clinicalSkills: unknown[];
  procedures: unknown[];
  certifications: unknown[];
  publicationDetails: unknown[];
  publications: unknown[];
  documentChecklist: unknown[];
  languages: unknown[];
}): number {
  const checks = [
    !!p.name,
    !!p.email,
    !!p.phone,
    !!(p.state || p.city),
    !!p.registrationNumber,
    !!p.specialty,
    !!p.grade,
    !!p.licenseStatus,
    !!p.summary,
    p.qualifications.length > 0,
    p.experience.length > 0,
    p.clinicalSkills.length > 0,
    p.procedures.length > 0,
    p.certifications.length > 0,
    p.publicationDetails.length > 0 || p.publications.length > 0,
    p.documentChecklist.length > 0,
    p.languages.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function buildSeedData(env: Env, now: Date) {
  const numbers = (env.OTP_TEST_NUMBERS ?? '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  if (numbers.length < 2) {
    throw new Error(
      'OTP_TEST_NUMBERS needs at least two numbers: one for the seeded candidate, one free for signup tests.',
    );
  }

  const planExpiresAt = new Date(now.getTime() + 2 * YEAR_MS);
  const hospitalBase = {
    onboardingStatus: 'Approved',
    onboardingPlan: 'Basic',
    isSuspended: false,
    deletedAt: null,
    verified: true,
    approvedAt: now,
    planExpiresAt,
  };

  const hospitals = [
    {
      ...hospitalBase,
      id: '5eed0000-0000-4000-8000-00000000a001',
      name: 'Seed City Multispeciality Hospital',
      shortName: 'Seed City Hospital',
      type: 'Multispeciality Hospital',
      city: 'Kolkata',
      state: 'West Bengal',
      email: 'hr@seed-city.test',
      beds: 250,
      founded: 2005,
      about: 'Test hospital for local development.',
      specialties: ['General Medicine', 'Cardiology', 'Nursing'],
      inviteCode: 'SEEDCITY0001',
    },
    {
      ...hospitalBase,
      id: '5eed0000-0000-4000-8000-00000000a002',
      name: 'Seed Valley Care Centre',
      shortName: 'Seed Valley',
      type: 'Clinic',
      city: 'Bengaluru',
      state: 'Karnataka',
      email: 'jobs@seed-valley.test',
      beds: 40,
      founded: 2015,
      about: 'Second test hospital for local development.',
      specialties: ['Dental', 'Radiology'],
      inviteCode: 'SEEDVALLEY02',
    },
  ];

  const [city, valley] = hospitals;
  const jobBase = { status: 'Active', visibilityEndsAt: null, postedOn: now, postedDays: 0 };
  const jobs = [
    {
      ...jobBase,
      id: '5eed0000-0000-4000-8000-00000000b001',
      hospitalId: city.id,
      role: 'Staff Nurse',
      category: 'Nurses',
      specialty: 'Nursing',
      location: 'Kolkata, West Bengal',
      city: 'Kolkata',
      salaryMin: 3,
      salaryMax: 4.5,
      experienceMin: 1,
      experienceMax: 5,
      type: 'Full-time',
      shift: 'Rotational',
      description: 'Staff nurse for the medical ward. Test job for local development.',
      tags: ['GNM', 'B.Sc Nursing'],
    },
    {
      ...jobBase,
      id: '5eed0000-0000-4000-8000-00000000b002',
      hospitalId: city.id,
      role: 'Consultant Cardiologist',
      category: 'Doctors',
      specialty: 'Cardiology',
      location: 'Kolkata, West Bengal',
      city: 'Kolkata',
      salaryMin: 30,
      salaryMax: 45,
      experienceMin: 5,
      experienceMax: 15,
      type: 'Full-time',
      shift: 'Day',
      description: 'Consultant for the cardiology OPD and cath lab. Test job for local development.',
      tags: ['DM Cardiology'],
    },
    {
      ...jobBase,
      id: '5eed0000-0000-4000-8000-00000000b003',
      hospitalId: valley.id,
      role: 'Radiology Technician',
      category: 'Technicians',
      specialty: 'Radiology',
      location: 'Bengaluru, Karnataka',
      city: 'Bengaluru',
      salaryMin: 2.5,
      salaryMax: 3.5,
      experienceMin: 0,
      experienceMax: 3,
      type: 'Part-time',
      shift: 'Evening',
      description: 'X-ray and CT technician, evening shift. Test job for local development.',
      tags: ['DMRIT'],
      // Phase 3: job-specific questions, one of every type the website supports (apply with job questions).
      customApplicationFields: [
        {
          id: 'q_modality',
          label: 'Which imaging machines have you operated?',
          type: 'text',
          required: true,
          placeholder: 'e.g. 128-slice CT',
        },
        {
          id: 'q_notes',
          label: 'Anything else the hospital should know?',
          type: 'textarea',
          required: false,
        },
        { id: 'q_scans', label: 'Scans you handle per day', type: 'number', required: true },
        {
          id: 'q_shift',
          label: 'Preferred shift',
          type: 'select',
          required: true,
          options: ['Morning', 'Evening', 'Night'],
        },
        {
          id: 'q_license',
          label: 'I hold a valid radiation safety certificate',
          type: 'checkbox',
          required: true,
        },
      ],
    },
    {
      ...jobBase,
      id: '5eed0000-0000-4000-8000-00000000b004',
      hospitalId: valley.id,
      role: 'Locum Dental Surgeon',
      category: 'Dentists',
      specialty: 'Dental Surgeon',
      location: 'Bengaluru, Karnataka',
      city: 'Bengaluru',
      salaryMin: 6,
      salaryMax: 8,
      experienceMin: 2,
      experienceMax: 10,
      type: 'Locum',
      shift: 'Day',
      description: 'Weekend locum cover for the dental clinic. Test job for local development.',
      tags: ['BDS'],
    },
  ];

  // Phase 2 E2E: listings in every deadline state the gov and international screens style. Fixed ids (upserts).
  // Dates are relative to the seed run, so the states stay true. Links are example.org: never a real site.
  const DAY = 24 * 60 * 60 * 1000;
  const daysFromNow = (n: number) => new Date(now.getTime() + n * DAY);
  const govJobs = [
    {
      id: '5eed0000-0000-4000-8000-00000000c001',
      examAuthority: 'AIIMS',
      name: 'Nursing Officer Recruitment (Test)',
      lastDate: daysFromNow(30),
      link: 'https://example.org/gov/aiims-nursing-officer',
    },
    {
      id: '5eed0000-0000-4000-8000-00000000c002',
      examAuthority: 'UPSC',
      name: 'Medical Officer Combined Exam (Test)',
      lastDate: daysFromNow(3),
      link: 'https://example.org/gov/upsc-medical-officer',
    },
    {
      id: '5eed0000-0000-4000-8000-00000000c003',
      examAuthority: 'State PSC',
      name: 'Staff Nurse Exam (Test, closed)',
      lastDate: daysFromNow(-10),
      link: 'https://example.org/gov/state-psc-staff-nurse',
    },
    {
      id: '5eed0000-0000-4000-8000-00000000c004',
      examAuthority: 'ESIC',
      name: 'Specialist Walk-in (Test, no deadline)',
      lastDate: null,
      link: 'https://example.org/gov/esic-specialist',
    },
  ];
  const intlJobs = [
    {
      id: '5eed0000-0000-4000-8000-00000000d001',
      jobPosition: 'Staff Nurse (Test)',
      specialty: 'ICU',
      city: 'London',
      country: 'United Kingdom',
      countryFlag: '🇬🇧',
      payscale: '£30k–£38k',
      experience: '2+ yrs',
      qualification: 'B.Sc Nursing',
      license: 'NMC',
      visaSponsorship: 'Sponsorship',
      applyLink: 'https://example.org/intl/uk-staff-nurse',
      lastDate: daysFromNow(40),
    },
    {
      id: '5eed0000-0000-4000-8000-00000000d002',
      jobPosition: 'Pharmacist (Test)',
      specialty: 'Retail',
      city: 'Dubai',
      country: 'UAE',
      countryFlag: '🇦🇪',
      payscale: 'AED 8k–12k',
      experience: '1+ yrs',
      qualification: 'B.Pharm',
      license: 'DHA',
      visaSponsorship: 'Employer',
      applyLink: 'https://example.org/intl/uae-pharmacist',
      lastDate: null,
    },
  ];

  // Phase 3: closed jobs the demo applicant has applied to (Closed jobs are not in the public list, so the four
  // public jobs and every Phase 2 count stay as they are).
  const closedBase = { ...jobBase, status: 'Closed' };
  const archived = (
    n: number,
    hospitalId: string,
    role: string,
    specialty: string,
    city: string,
    state: string,
  ) => ({
    ...closedBase,
    id: `5eed0000-0000-4000-8000-00000000e00${n}`,
    hospitalId,
    role,
    category: 'Archive',
    specialty,
    location: `${city}, ${state}`,
    city,
    salaryMin: 4,
    salaryMax: 6,
    experienceMin: 1,
    experienceMax: 6,
    type: 'Full-time',
    shift: 'Day',
    description: `${role}. Closed test job for the Phase 3 application states.`,
    tags: ['Test'],
  });
  const archivedJobs = [
    archived(1, city.id, 'ICU Nurse', 'Critical Care', 'Kolkata', 'West Bengal'),
    archived(2, city.id, 'Emergency Physician', 'Emergency Medicine', 'Kolkata', 'West Bengal'),
    archived(3, valley.id, 'Pharmacist', 'Pharmacy', 'Bengaluru', 'Karnataka'),
    archived(4, valley.id, 'Laboratory Technician', 'Pathology', 'Bengaluru', 'Karnataka'),
    archived(5, city.id, 'Physiotherapist', 'Physiotherapy', 'Kolkata', 'West Bengal'),
    archived(6, valley.id, 'Anaesthetist', 'Anaesthesia', 'Bengaluru', 'Karnataka'),
    archived(7, city.id, 'Ward Nurse (Night)', 'Nursing', 'Kolkata', 'West Bengal'),
    archived(8, valley.id, 'Radiologist', 'Radiology', 'Bengaluru', 'Karnataka'),
  ];

  // Phase 3: the Part 1 demo account. A filled profile (website `Profile` shape, completeness computed by the website
  // rule) so quick apply and apply-with-CV unlock. The Phase 2 candidate keeps NO profile (the "no form CV" cases).
  const applicantName = 'Demo Applicant';
  const applicantEmail = 'applicant@apronhanger.test';
  const applicantProfile = {
    name: applicantName,
    headline: 'General Physician · 6 years experience',
    email: applicantEmail,
    phone: '9876500088',
    city: 'Kolkata',
    state: 'West Bengal',
    avatar: initials(applicantName),
    verified: false,
    completeness: 0,
    role: 'Clinical Practitioners & Super Specialists (MBBS/ MD Physician/ MD/MS / DM / MCh / DNB-SS etc)',
    registrationNumber: 'WBMC-TEST-0001',
    registrationCouncil: 'West Bengal Medical Council',
    specialty: 'General Medicine',
    grade: 'Consultant',
    preferredRoleTypes: ['Full-time'],
    licenseStatus: 'Active',
    specialistRegisterStatus: '',
    revalidationDate: '',
    indemnityProvider: '',
    rightToWork: '',
    visaStatus: '',
    yearsExperience: 6,
    summary: 'Test profile for the app demo. Not a real person.',
    qualifications: [{ degree: 'MBBS', institution: 'Seed Medical College', year: '2016' }],
    experience: [
      {
        role: 'Resident Medical Officer',
        hospital: 'Seed City Multispeciality Hospital',
        city: 'Kolkata',
        start: '2018-01',
        end: '',
        current: true,
        summary: 'Ward and OPD duties.',
      },
    ],
    clinicalSkills: ['General Medicine', 'Emergency Care'],
    technicalSkills: ['ECG interpretation'],
    procedures: [{ name: 'Lumbar puncture', count: 20 }],
    certifications: [{ name: 'ACLS', issuer: 'Test Council', year: '2022' }],
    publications: [] as string[],
    publicationDetails: [] as string[],
    totalCitations: '',
    hIndex: '',
    i10Index: '',
    scholarUrl: '',
    orcid: '',
    professionalHighlights: [] as string[],
    languages: ['English', 'Bengali', 'Hindi'],
    availability: '30 days notice',
    expectedSalaryMin: 12,
    expectedSalaryMax: 18,
    currentSalaryMin: 10,
    currentSalaryMax: 12,
    preferredLocations: ['Kolkata', 'Bengaluru'],
    availabilityStatus: 'Open to Opportunities',
    linkedinUrl: '',
    documentChecklist: ['Medical registration certificate', 'MBBS degree'],
  };
  applicantProfile.completeness = computeCompleteness(applicantProfile);
  const applicant = {
    user: {
      email: applicantEmail,
      name: applicantName,
      role: 'CANDIDATE',
      mobile: null as string | null,
      initials: initials(applicantName),
    },
    profile: applicantProfile,
  };

  // One application per state the Phase 3 screens handle (one per closed job). Dates are relative to the seed run.
  const day = 24 * 60 * 60 * 1000;
  const ago = (d: number) => new Date(now.getTime() - d * day);
  const ahead = (d: number) => new Date(now.getTime() + d * day);
  const appId = (n: number) => `5eed0000-0000-4000-8000-00000000a10${n}`;
  const interviewer = {
    interviewerName: 'Dr. Seed Interviewer',
    interviewerEmail: 'interviewer@apronhanger.test',
    interviewRound: 1,
  };
  const applications: SeedApplication[] = [
    { id: appId(1), jobId: archivedJobs[0].id, status: 'Applied', appliedOn: ago(2) },
    {
      id: appId(2),
      jobId: archivedJobs[1].id,
      status: 'InterviewScheduled',
      appliedOn: ago(6),
      reviewedAt: ago(4),
      interviewScheduledAt: ago(1),
      interviewDate: ahead(3),
      interviewType: 'Virtual',
      meetingLink: 'https://example.org/meet/seed-interview',
      interviewNotes: 'Please join five minutes early.',
      ...interviewer,
    },
    {
      id: appId(3),
      jobId: archivedJobs[2].id,
      status: 'InterviewScheduled',
      appliedOn: ago(7),
      reviewedAt: ago(5),
      interviewScheduledAt: ago(1),
      interviewDate: ahead(5),
      interviewType: 'Physical',
      venue: 'Seed Valley Care Centre, 2nd floor, Bengaluru',
      ...interviewer,
    },
    {
      id: appId(4),
      jobId: archivedJobs[3].id,
      status: 'DocumentsRequested',
      appliedOn: ago(9),
      reviewedAt: ago(6),
      requestedDocumentList: ['Medical registration certificate', 'Experience letter', 'Identity proof'],
      documentRequestNote: 'Please upload clear scans. PDF or photo, up to 5 MB each.',
    },
    {
      id: appId(5),
      jobId: archivedJobs[4].id,
      status: 'DocumentsUploaded',
      appliedOn: ago(10),
      reviewedAt: ago(8),
      requestedDocumentList: ['Degree certificate'],
    },
    {
      id: appId(6),
      jobId: archivedJobs[5].id,
      status: 'OfferSent',
      appliedOn: ago(14),
      reviewedAt: ago(12),
      offerSentAt: ago(1),
      offerLetterUrl: 'https://example.org/offer-letter-seed.pdf',
    },
    {
      id: appId(7),
      jobId: archivedJobs[6].id,
      status: 'JoiningConfirmed',
      appliedOn: ago(20),
      reviewedAt: ago(18),
      offerSentAt: ago(10),
      offerLetterUrl: 'https://example.org/offer-letter-seed.pdf',
      joiningDate: ahead(30),
      joiningNote: 'Report to HR at 9 am with your original certificates.',
    },
    {
      id: appId(8),
      jobId: archivedJobs[7].id,
      status: 'Rejected',
      appliedOn: ago(12),
      reviewedAt: ago(9),
      finalStatusNote: 'The position has been filled.',
    },
  ];
  const applicationDocuments = [
    {
      id: '5eed0000-0000-4000-8000-00000000d101',
      applicationId: appId(5),
      name: 'Degree certificate',
      url: 'https://example.org/docs/degree-seed.pdf',
      cloudinaryId: 'seed/degree-seed',
      mime: 'application/pdf',
      uploadedBy: 'CANDIDATE',
    },
  ];

  const candidateName = 'Test Candidate';
  const candidate = {
    email: SEED_CANDIDATE_EMAIL,
    name: candidateName,
    role: 'CANDIDATE',
    mobile: numbers[0],
    initials: initials(candidateName),
  };

  const recruiter = {
    email: SEED_RECRUITER_EMAIL,
    name: 'Test Recruiter',
    role: 'RECRUITER',
    mobile: null,
    hospitalId: city.id,
  };

  /** Free for signup tests: seedApp deletes candidate accounts on these numbers each run, so signup E2E can repeat. */
  const signupNumbers = numbers.slice(1);

  /** Phase 4: what the bell and the notifications list show for the demo applicant (newest first). */
  const applicantNotifications = [
    {
      title: 'Interview Scheduled',
      message: 'Your interview for Staff Nurse has been scheduled.',
      read: false,
      link: '/applications',
      createdAt: new Date(now.getTime() - 60 * 60 * 1000),
    },
    {
      title: 'Application Received',
      message: 'Your application for Staff Nurse was received.',
      read: true,
      link: '/applications',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  return {
    candidate,
    recruiter,
    hospitals,
    jobs,
    govJobs,
    intlJobs,
    signupNumbers,
    applicant,
    applicantNotifications,
    archivedJobs,
    applications,
    applicationDocuments,
  };
}
