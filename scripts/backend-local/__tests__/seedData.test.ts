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

describe('seed government and international listings (Phase 2 E2E)', () => {
  it('have fixed unique ids, so re-running the seed updates instead of duplicating', () => {
    const a = buildSeedData(env, now);
    const b = buildSeedData(env, new Date(now.getTime() + DAY));
    expect(a.govJobs.map((j) => j.id)).toEqual(b.govJobs.map((j) => j.id));
    expect(a.intlJobs.map((j) => j.id)).toEqual(b.intlJobs.map((j) => j.id));
    expect(new Set(a.govJobs.map((j) => j.id)).size).toBe(a.govJobs.length);
    expect(new Set(a.intlJobs.map((j) => j.id)).size).toBe(a.intlJobs.length);
  });

  it('links are https on example.org, never a real site', () => {
    const { govJobs, intlJobs } = buildSeedData(env, now);
    for (const link of [...govJobs.map((j) => j.link), ...intlJobs.map((j) => j.applyLink)]) {
      expect(link).toMatch(/^https:\/\/example\.org\//);
    }
  });

  it('cover every deadline state the screens style: open, ending soon, expired, none', () => {
    const { govJobs, intlJobs } = buildSeedData(env, now);
    const left = (d: Date | null) => (d ? (d.getTime() - now.getTime()) / DAY : null);
    const states = govJobs.map((j) => left(j.lastDate));
    expect(states.some((d) => d !== null && d > 7)).toBe(true);
    expect(states.some((d) => d !== null && d > 0 && d <= 7)).toBe(true);
    expect(states.some((d) => d !== null && d < 0)).toBe(true);
    expect(states).toContain(null);
    expect(intlJobs.some((j) => j.lastDate && j.lastDate > now)).toBe(true);
  });

  it('international listings span two countries, so the country chips and filter can be tested', () => {
    const { intlJobs } = buildSeedData(env, now);
    expect(new Set(intlJobs.map((j) => j.country)).size).toBeGreaterThanOrEqual(2);
    for (const j of intlJobs) expect(j.countryFlag).toBeTruthy();
  });
});

// ── Phase 3 seed: the demo applicant, closed jobs and one application per state ─────────────────────────────

const websiteCompleteness = (p: Record<string, unknown>) => {
  const list = (k: string) => (Array.isArray(p[k]) ? (p[k] as unknown[]).length > 0 : false);
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
    list('qualifications'),
    list('experience'),
    list('clinicalSkills'),
    list('procedures'),
    list('certifications'),
    list('publicationDetails') || list('publications'),
    list('documentChecklist'),
    list('languages'),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

describe('seed demo applicant (Phase 3: the Part 1 demo account)', () => {
  it('is a second candidate, so the Phase 2 candidate stays without a form CV', () => {
    const { applicant, candidate } = buildSeedData(env, now);
    expect(applicant.user).toMatchObject({ role: 'CANDIDATE', mobile: null });
    expect(applicant.user.email).toMatch(/@[a-z.]+\.test$/);
    expect(applicant.user.email).not.toBe(candidate.email);
    expect(applicant.user.initials).toBe('DA');
  });

  it('has a filled profile: completeness is the website rule and at least 30, so quick apply and CV apply unlock', () => {
    const { applicant } = buildSeedData(env, now);
    expect(applicant.profile.completeness).toBe(websiteCompleteness(applicant.profile));
    expect(applicant.profile.completeness).toBeGreaterThanOrEqual(30);
    expect(applicant.profile.email).toBe(applicant.user.email);
    expect(applicant.profile.verified).toBe(false);
    expect(applicant.profile.phone).toMatch(/^\d{10}$/);
  });

  it('does not take a signup test number (phone only inside the profile)', () => {
    const { applicant, signupNumbers } = buildSeedData(env, now);
    expect(signupNumbers).not.toContain(applicant.profile.phone);
  });

  it('has notifications for the bell and the list (Phase 4): one unread that opens My Applications, one read', () => {
    const { applicantNotifications } = buildSeedData(env, now);
    expect(applicantNotifications).toHaveLength(2);
    const unread = applicantNotifications.filter((n) => !n.read);
    expect(unread).toHaveLength(1);
    expect(unread[0]).toMatchObject({ link: '/applications' });
    expect(applicantNotifications.every((n) => n.title.length > 0 && n.message.length > 0)).toBe(true);
    // Newest first, as the server lists them; dates relative to the seed run.
    expect(unread[0]!.createdAt.getTime()).toBeGreaterThan(applicantNotifications.find((n) => n.read)!.createdAt.getTime());
    expect(unread[0]!.createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
  });
});

describe('seed closed jobs for the applicant (public job counts stay at four)', () => {
  it('are Closed, have fixed unique ids and belong to seeded hospitals', () => {
    const { archivedJobs, jobs, hospitals } = buildSeedData(env, now);
    expect(archivedJobs).toHaveLength(8);
    expect(new Set(archivedJobs.map((j) => j.id)).size).toBe(8);
    expect(archivedJobs.every((j) => j.status === 'Closed')).toBe(true);
    expect(archivedJobs.every((j) => hospitals.some((h) => h.id === j.hospitalId))).toBe(true);
    expect(archivedJobs.some((a) => jobs.some((j) => j.id === a.id))).toBe(false);
    expect(jobs).toHaveLength(4);
  });
});

describe('seed job questions (apply with job questions)', () => {
  const fields = () => {
    const radiology = buildSeedData(env, now).jobs.find((j) => j.role === 'Radiology Technician');
    return (radiology as { customApplicationFields?: Record<string, unknown>[] } | undefined)
      ?.customApplicationFields;
  };

  it('Radiology Technician asks one question of every type the website supports', () => {
    const f = fields() ?? [];
    expect(f.map((x) => x.type).sort()).toEqual(['checkbox', 'number', 'select', 'text', 'textarea']);
    expect(new Set(f.map((x) => x.id)).size).toBe(f.length);
  });

  it('has required and optional questions, and a select with options', () => {
    const f = fields() ?? [];
    expect(f.some((x) => x.required === true)).toBe(true);
    expect(f.some((x) => x.required === false)).toBe(true);
    const select = f.find((x) => x.type === 'select');
    expect(Array.isArray(select?.options) && (select?.options as string[]).length >= 2).toBe(true);
  });
});

describe('seed applications of the applicant: one per state the Phase 3 screens handle', () => {
  const data = () => buildSeedData(env, now);

  it('cover Applied, interviews, document requests, offer, joining and a rejection', () => {
    const statuses = data().applications.map((a) => a.status);
    expect(statuses).toEqual(
      expect.arrayContaining([
        'Applied',
        'InterviewScheduled',
        'DocumentsRequested',
        'DocumentsUploaded',
        'OfferSent',
        'JoiningConfirmed',
        'Rejected',
      ]),
    );
    expect(statuses.filter((s) => s === 'InterviewScheduled')).toHaveLength(2);
  });

  it('use each closed job once (one application per job and candidate) and have fixed unique ids', () => {
    const { applications, archivedJobs } = data();
    expect(new Set(applications.map((a) => a.id)).size).toBe(applications.length);
    expect(new Set(applications.map((a) => a.jobId)).size).toBe(applications.length);
    expect(applications.every((a) => archivedJobs.some((j) => j.id === a.jobId))).toBe(true);
  });

  it('interviews are in the future, one virtual with a link and one in person with a venue', () => {
    const interviews = data().applications.filter((a) => a.status === 'InterviewScheduled');
    for (const i of interviews)
      expect((i.interviewDate as Date).getTime()).toBeGreaterThan(now.getTime() + DAY);
    const virtual = interviews.find((i) => i.interviewType === 'Virtual');
    const physical = interviews.find((i) => i.interviewType === 'Physical');
    expect(virtual?.meetingLink).toMatch(/^https:\/\/example\.org\//);
    expect(physical?.venue).toBeTruthy();
    expect(interviews.every((i) => i.interviewerName && i.interviewerEmail?.endsWith('.test'))).toBe(true);
  });

  it('the document request lists what is needed and has a note', () => {
    const req = data().applications.find((a) => a.status === 'DocumentsRequested');
    expect(Array.isArray(req?.requestedDocumentList) && req.requestedDocumentList.length >= 2).toBe(true);
    expect(req?.documentRequestNote).toBeTruthy();
  });

  it('the offer has a letter link and the joining has a date; links are https on example.org', () => {
    const { applications } = data();
    const offer = applications.find((a) => a.status === 'OfferSent');
    const joining = applications.find((a) => a.status === 'JoiningConfirmed');
    expect(offer?.offerLetterUrl).toMatch(/^https:\/\/example\.org\//);
    expect((joining?.joiningDate as Date).getTime()).toBeGreaterThan(now.getTime());
    expect(joining?.joiningNote).toBeTruthy();
  });

  it('the rejection carries a final note; the submitted documents have example.org links', () => {
    const { applications, applicationDocuments } = data();
    expect(applications.find((a) => a.status === 'Rejected')?.finalStatusNote).toBeTruthy();
    const submitted = applications.find((a) => a.status === 'DocumentsUploaded');
    const docs = applicationDocuments.filter((d) => d.applicationId === submitted?.id);
    expect(docs.length).toBeGreaterThanOrEqual(1);
    expect(docs.every((d) => d.url.startsWith('https://example.org/'))).toBe(true);
  });
});
