// A small stand-in for the jobs backend, for screen tests: lists, saved jobs that change when saved/unsaved, the
// candidate row, gov and intl listings. Tests override single routes with `server.use(...)` for error cases.
import { http, HttpResponse } from 'msw';

import type { Job, SavedJob } from '@/api/schemas/jobs';
import { candidateMe, govJob, intlJob, publicJob } from '@/test/fixtures/jobs';

import { API } from './handlers';
import { server } from './server';

export type JobsBackend = {
  jobs: Job[];
  saved: SavedJob[];
  me: unknown;
  gov: unknown[];
  intl: unknown[];
  /** Requests seen, e.g. `GET /api/jobs`. */
  calls: string[];
};

/** A job with the schema's defaults filled in. */
export function makeJob(over: Partial<Job> & { id: string }): Job {
  return {
    ...(publicJob as unknown as Job),
    tags: [],
    responsibilities: [],
    requirements: [],
    perks: [],
    postedDays: 0,
    ...over,
  };
}

export function installJobsBackend(initial: Partial<JobsBackend> = {}): JobsBackend {
  const b: JobsBackend = {
    jobs: [],
    saved: [],
    me: candidateMe,
    gov: [govJob],
    intl: [intlJob],
    calls: [],
    ...initial,
  };
  const note = (m: string, url: string) =>
    b.calls.push(`${m} ${new URL(url).pathname}${new URL(url).search}`);

  server.use(
    http.get(`${API}/api/jobs`, ({ request }) => {
      note('GET', request.url);
      const url = new URL(request.url);
      const category = url.searchParams.get('category');
      const exclude = url.searchParams.get('excludeId');
      const limit = Number(url.searchParams.get('limit') ?? 50);
      const list = b.jobs.filter((j) => (!category || j.category === category) && j.id !== exclude);
      return HttpResponse.json(list.slice(0, limit));
    }),
    http.get(`${API}/api/jobs/:id`, ({ request, params }) => {
      note('GET', request.url);
      const job = b.jobs.find((j) => j.id === params.id);
      return job ? HttpResponse.json(job) : HttpResponse.json({ error: 'Job not found' }, { status: 404 });
    }),
    http.get(`${API}/api/saved-jobs`, ({ request }) => {
      note('GET', request.url);
      return HttpResponse.json(b.saved);
    }),
    http.post(`${API}/api/saved-jobs`, async ({ request }) => {
      note('POST', request.url);
      const { jobId } = (await request.json()) as { jobId: string };
      const job = b.jobs.find((j) => j.id === jobId);
      if (!job) return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
      const item = { savedAt: '2026-10-26T09:00:00.000Z', job };
      b.saved.unshift(item);
      return HttpResponse.json(item, { status: 201 });
    }),
    http.delete(`${API}/api/saved-jobs/:id`, ({ request, params }) => {
      note('DELETE', request.url);
      const at = b.saved.findIndex((s) => s.job.id === params.id);
      if (at < 0) return HttpResponse.json({ error: 'Saved job not found' }, { status: 404 });
      b.saved.splice(at, 1);
      return HttpResponse.json({ success: true });
    }),
    http.get(`${API}/api/candidates/me`, ({ request }) => {
      note('GET', request.url);
      return HttpResponse.json(b.me as never);
    }),
    http.get(`${API}/api/gov-jobs`, ({ request }) => {
      note('GET', request.url);
      return HttpResponse.json(b.gov as never);
    }),
    http.get(`${API}/api/intl-jobs`, ({ request }) => {
      note('GET', request.url);
      return HttpResponse.json(b.intl as never);
    }),
  );
  return b;
}
