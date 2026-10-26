import { candidateMe, formProfile, govJob, intlJob, publicJob, savedJobItem } from '@/test/fixtures/jobs';

import { CandidateMeSchema } from '../candidate';
import {
  GovJobListSchema,
  IntlJobListSchema,
  JobListSchema,
  SavedJobListSchema,
  SavedJobSchema,
} from '../jobs';

describe('JobListSchema (GET /api/jobs, a bare array)', () => {
  it('parses the backend shape and keeps extra fields', () => {
    const [job] = JobListSchema.parse([publicJob]);
    expect(job).toMatchObject({ id: publicJob.id, role: 'Staff Nurse', hospital: publicJob.hospital });
    expect(job).toHaveProperty('postedBy');
  });

  it('accepts an empty list', () => {
    expect(JobListSchema.parse([])).toEqual([]);
  });

  it('accepts a job without a posted date', () => {
    expect(() => JobListSchema.parse([{ ...publicJob, postedOn: null }])).not.toThrow();
  });

  it.each([
    'id',
    'role',
    'specialty',
    'location',
    'type',
    'salaryMin',
    'salaryMax',
    'hospitalId',
    'hospital',
  ] as const)('requires %s', (key) => {
    const { [key]: _drop, ...rest } = publicJob;
    expect(JobListSchema.safeParse([rest]).success).toBe(false);
  });

  it('rejects an object where the website expects an array', () => {
    expect(JobListSchema.safeParse({ jobs: [publicJob] }).success).toBe(false);
  });
});

describe('GovJobListSchema (GET /api/gov-jobs)', () => {
  it('parses, with or without a last date', () => {
    expect(GovJobListSchema.parse([govJob, { ...govJob, id: 'g2', lastDate: null }])).toHaveLength(2);
  });

  it.each(['id', 'examAuthority', 'name', 'link'] as const)('requires %s', (key) => {
    const { [key]: _drop, ...rest } = govJob;
    expect(GovJobListSchema.safeParse([rest]).success).toBe(false);
  });
});

describe('IntlJobListSchema (GET /api/intl-jobs)', () => {
  it('parses', () => {
    expect(IntlJobListSchema.parse([intlJob])[0]).toMatchObject({
      country: 'United Kingdom',
      countryFlag: '🇬🇧',
    });
  });

  it.each(['id', 'jobPosition', 'country', 'applyLink', 'visaSponsorship'] as const)('requires %s', (key) => {
    const { [key]: _drop, ...rest } = intlJob;
    expect(IntlJobListSchema.safeParse([rest]).success).toBe(false);
  });
});

describe('JobSchema defaults (screens never see undefined lists)', () => {
  it('fills lists and numbers the backend leaves out', () => {
    const {
      tags: _t,
      responsibilities: _r,
      requirements: _q,
      perks: _p,
      postedDays: _d,
      ...rest
    } = publicJob;
    const [job] = JobListSchema.parse([rest]);
    expect(job).toMatchObject({ tags: [], responsibilities: [], requirements: [], perks: [], postedDays: 0 });
  });

  it('accepts null category, description, logo and experience', () => {
    const [job] = JobListSchema.parse([
      { ...publicJob, category: null, description: null, hospitalLogoUrl: null, experienceMin: null },
    ]);
    expect(job?.category).toBeNull();
  });

  it('keeps matchPercent when the server sends it', () => {
    expect(JobListSchema.parse([{ ...publicJob, matchPercent: 77 }])[0]?.matchPercent).toBe(77);
  });
});

describe('SavedJobListSchema (GET /api/saved-jobs, fixed by hotfix PR 1)', () => {
  it('parses { savedAt, job }', () => {
    const [item] = SavedJobListSchema.parse([savedJobItem]);
    expect(item?.job.id).toBe(publicJob.id);
  });

  it('requires savedAt and job', () => {
    expect(SavedJobListSchema.safeParse([{ job: savedJobItem.job }]).success).toBe(false);
    expect(SavedJobListSchema.safeParse([{ savedAt: savedJobItem.savedAt }]).success).toBe(false);
  });

  it('a POST /api/saved-jobs reply has the same shape', () => {
    expect(SavedJobSchema.parse(savedJobItem).savedAt).toBe(savedJobItem.savedAt);
  });
});

describe('CandidateMatchProfileSchema (GET /api/candidates/me, matching fields only)', () => {
  it('accepts a candidate with no profile', () => {
    expect(CandidateMeSchema.parse(candidateMe).profile).toBeNull();
  });

  it('accepts a form profile and keeps its fields', () => {
    expect(CandidateMeSchema.parse({ ...candidateMe, profile: formProfile }).profile).toMatchObject({
      completeness: 80,
      city: 'Kolkata',
    });
  });

  it('fills lists a thin profile leaves out', () => {
    const p = CandidateMeSchema.parse({ ...candidateMe, profile: { role: 'X', completeness: 10 } }).profile;
    expect(p).toMatchObject({ clinicalSkills: [], technicalSkills: [], preferredLocations: [] });
  });
});
