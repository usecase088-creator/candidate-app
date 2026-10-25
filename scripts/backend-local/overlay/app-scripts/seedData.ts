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

  return { candidate, recruiter, hospitals, jobs };
}
