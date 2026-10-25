import {
  buildSeedData,
  SEED_CANDIDATE_EMAIL,
  SEED_PASSWORD,
  SEED_RECRUITER_EMAIL,
} from '../overlay/app-scripts/seedData.ts';

const env = { OTP_TEST_NUMBERS: '9000000001,9000000002,9000000003' };
const now = new Date('2026-10-25T10:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

describe('seed accounts', () => {
  it('password meets the backend register rules', () => {
    // ../job/backend/src/routes/authRoutes.ts POST /register
    expect(SEED_PASSWORD.length).toBeGreaterThanOrEqual(8);
    expect(SEED_PASSWORD).toMatch(/[A-Z]/);
    expect(SEED_PASSWORD).toMatch(/[a-z]/);
    expect(SEED_PASSWORD).toMatch(/[^A-Za-z0-9]/);
  });

  it('uses .test emails, which can never reach a real inbox', () => {
    expect(SEED_CANDIDATE_EMAIL).toMatch(/@[a-z.]+\.test$/);
    expect(SEED_RECRUITER_EMAIL).toMatch(/@[a-z.]+\.test$/);
  });

  it('gives the candidate the first OTP test number (for forgot-password flows)', () => {
    const { candidate } = buildSeedData(env, now);
    expect(candidate).toMatchObject({ email: SEED_CANDIDATE_EMAIL, role: 'CANDIDATE', mobile: '9000000001' });
  });

  it('computes initials the way register does', () => {
    expect(buildSeedData(env, now).candidate.initials).toBe('TC');
  });

  it('needs at least two test numbers so one stays free for signup tests', () => {
    expect(() => buildSeedData({ OTP_TEST_NUMBERS: '9000000001' }, now)).toThrow(/OTP_TEST_NUMBERS/);
    expect(() => buildSeedData({}, now)).toThrow(/OTP_TEST_NUMBERS/);
  });

  it('links the recruiter to the first seeded hospital', () => {
    const { recruiter, hospitals } = buildSeedData(env, now);
    expect(recruiter).toMatchObject({
      email: SEED_RECRUITER_EMAIL,
      role: 'RECRUITER',
      hospitalId: hospitals[0].id,
    });
  });
});

describe('seed hospitals', () => {
  it('are approved, active and their plan is far from expiring, so their jobs are public', () => {
    const { hospitals } = buildSeedData(env, now);
    expect(hospitals.length).toBeGreaterThanOrEqual(2);
    for (const h of hospitals) {
      expect(h).toMatchObject({
        onboardingStatus: 'Approved',
        isSuspended: false,
        deletedAt: null,
        approvedAt: now,
      });
      expect(h.planExpiresAt.getTime() - now.getTime()).toBeGreaterThanOrEqual(365 * DAY);
    }
  });

  it('have fixed ids so re-running the seed updates instead of duplicating', () => {
    const a = buildSeedData(env, now);
    const b = buildSeedData(env, new Date(now.getTime() + DAY));
    expect(a.hospitals.map((h) => h.id)).toEqual(b.hospitals.map((h) => h.id));
    expect(a.jobs.map((j) => j.id)).toEqual(b.jobs.map((j) => j.id));
    expect(new Set(a.hospitals.map((h) => h.id)).size).toBe(a.hospitals.length);
  });
});

describe('seed jobs', () => {
  it('are active, never hidden by a visibility end date, and belong to seeded hospitals', () => {
    const { jobs, hospitals } = buildSeedData(env, now);
    const hospitalIds = new Set(hospitals.map((h) => h.id));
    expect(jobs.length).toBeGreaterThanOrEqual(3);
    for (const j of jobs) {
      expect(j).toMatchObject({ status: 'Active', visibilityEndsAt: null });
      expect(hospitalIds.has(j.hospitalId)).toBe(true);
      expect(j.salaryMax).toBeGreaterThanOrEqual(j.salaryMin);
    }
  });

  it('use job types the website filter knows', () => {
    // ../job/candidates/src/components/jobs/FilterSidebar.tsx TYPES
    const types = ['Full-time', 'Locum', 'Part-time', 'Contract'];
    for (const j of buildSeedData(env, now).jobs) expect(types).toContain(j.type);
  });

  it('have unique ids', () => {
    const { jobs } = buildSeedData(env, now);
    expect(new Set(jobs.map((j) => j.id)).size).toBe(jobs.length);
  });
});

describe('signup test numbers', () => {
  it('are every test number except the seeded candidate one, freed again on each seed', () => {
    expect(buildSeedData(env, now).signupNumbers).toEqual(['9000000002', '9000000003']);
  });
});
