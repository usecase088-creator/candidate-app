import { govJob, intlJob, publicJob } from '@/test/fixtures/jobs';

import { GovJobListSchema, IntlJobListSchema, JobListSchema } from '../jobs';

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
