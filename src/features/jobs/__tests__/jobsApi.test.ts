import { http, HttpResponse } from 'msw';

import { candidateMe, govJob, intlJob, publicJob, savedJobItem } from '@/test/fixtures/jobs';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';

import { jobsApi } from '../jobsApi';

/** Records the URL the app requested. */
function record(method: 'get' | 'post' | 'delete', path: string, body: unknown, status = 200) {
  const seen: { url: URL; body?: unknown }[] = [];
  server.use(
    http[method](`${API}${path}`, async ({ request }) => {
      seen.push({ url: new URL(request.url), body: method === 'post' ? await request.json() : undefined });
      return HttpResponse.json(body as never, { status });
    }),
  );
  return seen;
}

describe('jobs', () => {
  it('list: GET /api/jobs with no query (the website fetches all and filters on the device)', async () => {
    const seen = record('get', '/api/jobs', [publicJob]);
    await expect(jobsApi.list()).resolves.toHaveLength(1);
    expect(seen[0]?.url.search).toBe('');
  });

  it('get: GET /api/jobs/:id, id is URL-encoded', async () => {
    const seen = record('get', '/api/jobs/a%20b', publicJob);
    await expect(jobsApi.get('a b')).resolves.toMatchObject({ id: publicJob.id });
    expect(seen[0]?.url.pathname).toBe('/api/jobs/a%20b');
  });

  it('get: 404 is an ApiError with the backend message', async () => {
    record('get', '/api/jobs/x', { error: 'Job not found' }, 404);
    await expect(jobsApi.get('x')).rejects.toMatchObject({ status: 404, serverMessage: 'Job not found' });
  });

  it('similar: category, excludeId and limit=4, like the website', async () => {
    const seen = record('get', '/api/jobs', [publicJob]);
    await jobsApi.similar('Nursing Professionals & Paramedics', 'j1');
    expect(seen[0]?.url.searchParams.get('category')).toBe('Nursing Professionals & Paramedics');
    expect(seen[0]?.url.searchParams.get('excludeId')).toBe('j1');
    expect(seen[0]?.url.searchParams.get('limit')).toBe('4');
  });

  it('similar: drops the job itself and keeps at most 4 (website filter + slice)', async () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ ...publicJob, id: `j${i}` }));
    record('get', '/api/jobs', many);
    const list = await jobsApi.similar('Nurses', 'j0');
    expect(list.map((j) => j.id)).toEqual(['j1', 'j2', 'j3', 'j4']);
  });

  it('a parse failure is an ApiError of kind parse', async () => {
    record('get', '/api/jobs', { jobs: [] });
    await expect(jobsApi.list()).rejects.toMatchObject({ kind: 'parse' });
  });
});

describe('saved jobs', () => {
  it('savedList: GET /api/saved-jobs', async () => {
    record('get', '/api/saved-jobs', [savedJobItem]);
    await expect(jobsApi.savedList()).resolves.toMatchObject([{ job: { id: publicJob.id } }]);
  });

  it('save: POST { jobId }', async () => {
    const seen = record('post', '/api/saved-jobs', savedJobItem, 201);
    await jobsApi.save('j1');
    expect(seen[0]?.body).toEqual({ jobId: 'j1' });
  });

  it('unsave: DELETE /api/saved-jobs/:jobId', async () => {
    const seen = record('delete', '/api/saved-jobs/j1', { success: true });
    await expect(jobsApi.unsave('j1')).resolves.toBeUndefined();
    expect(seen).toHaveLength(1);
  });

  it('save: 409 keeps its status so the caller can treat it as already saved', async () => {
    record('post', '/api/saved-jobs', { error: 'Job already saved' }, 409);
    await expect(jobsApi.save('j1')).rejects.toMatchObject({
      status: 409,
      serverMessage: 'Job already saved',
    });
  });
});

describe('government, international and the candidate', () => {
  it('govList', async () => {
    record('get', '/api/gov-jobs', [govJob]);
    await expect(jobsApi.govList()).resolves.toMatchObject([{ examAuthority: 'AIIMS' }]);
  });

  it('intlList', async () => {
    record('get', '/api/intl-jobs', [intlJob]);
    await expect(jobsApi.intlList()).resolves.toMatchObject([{ country: 'United Kingdom' }]);
  });

  it('me: GET /api/candidates/me (read only, never PUT: group B 19)', async () => {
    record('get', '/api/candidates/me', candidateMe);
    await expect(jobsApi.me()).resolves.toMatchObject({ id: 'c1' });
  });
});
