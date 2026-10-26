// Public job lists parse with the app's schemas (PHASE-1 Task 9). Local backend only.
import { z } from 'zod';

import { AuthResponseSchema } from '@/api/schemas/auth';
import { CandidateMeSchema } from '@/api/schemas/candidate';
import {
  GovJobListSchema,
  IntlJobListSchema,
  JobListSchema,
  JobSchema,
  SavedJobListSchema,
  SavedJobSchema,
  SuccessSchema,
} from '@/api/schemas/jobs';

import { contractClient, SEED } from './backend';

const api = contractClient();

it('GET /api/jobs is a bare array that parses, with the 4 seeded jobs', async () => {
  const jobs = await api.get('/api/jobs', JobListSchema);
  const ids = jobs.map((j) => j.id);
  for (const id of ['b001', 'b002', 'b003', 'b004']) {
    expect(ids).toContain(`5eed0000-0000-4000-8000-00000000${id}`);
  }
});

it('GET /api/gov-jobs parses', async () => {
  await expect(api.get('/api/gov-jobs', GovJobListSchema)).resolves.toEqual(expect.any(Array));
});

it('GET /api/intl-jobs parses', async () => {
  await expect(api.get('/api/intl-jobs', IntlJobListSchema)).resolves.toEqual(expect.any(Array));
});

// ---- Phase 2: job details, similar jobs, match score, saved jobs (hotfix PR 1 regressions) ----

const NURSE_JOB = '5eed0000-0000-4000-8000-00000000b001';

// One login for the file: the login limiter allows 20 per 15 minutes per IP (API.md), shared by every contract file.
let cachedToken: Promise<string> | undefined;
async function signedInClient() {
  cachedToken ??= contractClient()
    .post('/api/auth/login', { email: SEED.candidateEmail, password: SEED.password }, AuthResponseSchema)
    .then((r) => r.token);
  const client = contractClient();
  client.setAuthToken(await cachedToken);
  return client;
}

describe('jobs with a candidate token', () => {
  it('GET /api/jobs: every job has matchPercent 52-98 for a signed-in candidate, none without a token', async () => {
    const withToken = await (await signedInClient()).get('/api/jobs', JobListSchema);
    expect(withToken.length).toBeGreaterThanOrEqual(4);
    for (const job of withToken) {
      expect(job.matchPercent).toBeGreaterThanOrEqual(52);
      expect(job.matchPercent).toBeLessThanOrEqual(98);
    }
    const guest = await api.get('/api/jobs', JobListSchema);
    expect(guest.every((j) => j.matchPercent == null)).toBe(true);
  });

  it('GET /api/jobs: the public list has no recruiter email (A4)', async () => {
    const raw = await api.get(
      '/api/jobs',
      z.array(z.object({ postedBy: z.object({}).loose().nullish() }).loose()),
    );
    for (const job of raw) expect(job.postedBy).not.toHaveProperty('email');
  });

  it('GET /api/jobs/:id parses; an unknown id is 404 "Job not found"', async () => {
    await expect(api.get(`/api/jobs/${NURSE_JOB}`, JobSchema)).resolves.toMatchObject({
      role: 'Staff Nurse',
    });
    await expect(api.get('/api/jobs/does-not-exist', JobSchema)).rejects.toMatchObject({
      status: 404,
      serverMessage: 'Job not found',
    });
  });

  it('GET /api/jobs?category=&excludeId=&limit= is the similar-jobs query', async () => {
    const jobs = await api.get('/api/jobs', JobListSchema, {
      query: { category: 'Nurses', excludeId: NURSE_JOB, limit: 4 },
    });
    expect(jobs.every((j) => j.category === 'Nurses' && j.id !== NURSE_JOB)).toBe(true);
  });

  it('GET /api/candidates/me parses with the matching schema', async () => {
    await expect(
      (await signedInClient()).get('/api/candidates/me', CandidateMeSchema),
    ).resolves.toMatchObject({
      cvSource: null,
    });
  });
});

/** Paths of any `applications` list or `candidateId` key in a response. */
function findLeaks(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => findLeaks(v, `${path}[${i}]`));
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([k, v]) => [
    ...((k === 'applications' && Array.isArray(v)) || k === 'candidateId' ? [`${path}.${k}`] : []),
    ...findLeaks(v, `${path}.${k}`),
  ]);
}

describe('saved jobs (fixed by hotfix PR 1)', () => {
  it('save, list, save again (409), unsave, unsave again (404)', async () => {
    const client = await signedInClient();
    // Start clean: an earlier failed run may have left it saved.
    await client.delete(`/api/saved-jobs/${NURSE_JOB}`, SuccessSchema).catch(() => undefined);

    const saved = await client.post('/api/saved-jobs', { jobId: NURSE_JOB }, SavedJobSchema);
    expect(saved.job.id).toBe(NURSE_JOB);

    const list = await client.get('/api/saved-jobs', SavedJobListSchema);
    expect(list.map((s) => s.job.id)).toContain(NURSE_JOB);

    await expect(client.post('/api/saved-jobs', { jobId: NURSE_JOB }, SavedJobSchema)).rejects.toMatchObject({
      status: 409,
      serverMessage: 'Job already saved',
    });

    await expect(client.delete(`/api/saved-jobs/${NURSE_JOB}`, SuccessSchema)).resolves.toEqual({
      success: true,
    });
    await expect(client.delete(`/api/saved-jobs/${NURSE_JOB}`, SuccessSchema)).rejects.toMatchObject({
      status: 404,
      serverMessage: 'Saved job not found',
    });
  });

  it('the saved-jobs response has no applications list and no recruiter email (A1: other candidates were exposed)', async () => {
    const client = await signedInClient();
    await client.delete(`/api/saved-jobs/${NURSE_JOB}`, SuccessSchema).catch(() => undefined);
    await client.post('/api/saved-jobs', { jobId: NURSE_JOB }, SavedJobSchema);
    try {
      const raw = await client.get(
        '/api/saved-jobs',
        z.array(z.object({ job: z.record(z.string(), z.unknown()) }).loose()),
      );
      expect(raw.length).toBeGreaterThan(0);
      for (const item of raw) {
        expect(item.job).not.toHaveProperty('applications');
        expect(item.job.postedBy ?? {}).not.toHaveProperty('email');
        expect(item.job).toHaveProperty('applicants');
        // Nothing nested may carry another candidate's data either (a count like _count.applications is fine).
        expect(findLeaks(item)).toEqual([]);
      }
    } finally {
      await client.delete(`/api/saved-jobs/${NURSE_JOB}`, SuccessSchema).catch(() => undefined);
    }
  });

  it('GET /api/saved-jobs without a token is 401', async () => {
    await expect(api.get('/api/saved-jobs', SavedJobListSchema)).rejects.toMatchObject({ status: 401 });
  });
});
