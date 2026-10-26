import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, screen, waitFor } from '@testing-library/react-native';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Job, SavedJob } from '@/api/schemas/jobs';
import { ToastProvider } from '@/components/ui/Toast';
import { publicJob } from '@/test/fixtures/jobs';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { createTestQueryClient } from '@/test/render';

import { SAVED_JOBS_KEY } from '../hooks/queryKeys';
import { useSavedIdSet, useToggleSave } from '../hooks/useSavedJobs';

const job = publicJob as unknown as Job;
const other = { ...job, id: 'other' } as Job;
const jobs: Record<string, Job> = { [job.id]: job, other };
const item = (j: Job): SavedJob => ({ savedAt: '2026-10-26T09:00:00.000Z', job: j });

/** A small stand-in for the backend: the list changes when saves and unsaves succeed, like the real one. */
function backend(initial: Job[] = []) {
  const saved = initial.map(item);
  server.use(
    http.get(`${API}/api/saved-jobs`, () => HttpResponse.json([...saved])),
    http.post(`${API}/api/saved-jobs`, async ({ request }) => {
      const { jobId } = (await request.json()) as { jobId: string };
      const j = jobs[jobId] ?? job;
      saved.unshift(item(j));
      return HttpResponse.json(item(j), { status: 201 });
    }),
    http.delete(`${API}/api/saved-jobs/:id`, ({ params }) => {
      const at = saved.findIndex((s) => s.job.id === params.id);
      if (at >= 0) saved.splice(at, 1);
      return HttpResponse.json({ success: true });
    }),
  );
  return saved;
}

async function mount() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
  const hook = await renderHook(
    () => {
      const ids = useSavedIdSet();
      const { toggle } = useToggleSave();
      return { ids, toggle };
    },
    { wrapper },
  );
  await waitFor(() => expect(queryClient.getQueryState(SAVED_JOBS_KEY)?.status).toBe('success'));
  return { ...hook, queryClient };
}

describe('useToggleSave', () => {
  it('save: the job is saved at once, before the server answers; toast "Job saved"', async () => {
    backend();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    server.use(
      http.post(`${API}/api/saved-jobs`, async () => {
        await gate;
        return HttpResponse.json(item(job), { status: 201 });
      }),
    );
    const { result } = await mount();
    expect(result.current.ids.has(job.id)).toBe(false);

    result.current.toggle(job);
    await waitFor(() => expect(result.current.ids.has(job.id)).toBe(true)); // optimistic

    release();
    expect(await screen.findByText('Job saved')).toBeTruthy();
  });

  it('save failing: rolls back and shows the server message', async () => {
    backend();
    server.use(
      http.post(`${API}/api/saved-jobs`, () =>
        HttpResponse.json({ error: 'Nope from server' }, { status: 400 }),
      ),
    );
    const { result } = await mount();
    result.current.toggle(job);
    expect(await screen.findByText('Nope from server')).toBeTruthy();
    expect(result.current.ids.has(job.id)).toBe(false);
  });

  it('save failing with a server error: rolls back and uses the website text "Failed to save job"', async () => {
    backend();
    server.use(
      http.post(`${API}/api/saved-jobs`, () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
    );
    const { result } = await mount();
    result.current.toggle(job);
    expect(await screen.findByText('Failed to save job')).toBeTruthy();
    expect(result.current.ids.has(job.id)).toBe(false);
  });

  it('save with no network: rolls back and says so', async () => {
    backend();
    server.use(http.post(`${API}/api/saved-jobs`, () => HttpResponse.error()));
    const { result } = await mount();
    result.current.toggle(job);
    expect(
      await screen.findByText('Network error. Please check your connection and try again.'),
    ).toBeTruthy();
    expect(result.current.ids.has(job.id)).toBe(false);
  });

  it('unsave: removed at once; toast "Removed from saved jobs"', async () => {
    backend([job]);
    const { result } = await mount();
    expect(result.current.ids.has(job.id)).toBe(true);
    result.current.toggle(job);
    await waitFor(() => expect(result.current.ids.has(job.id)).toBe(false));
    expect(await screen.findByText('Removed from saved jobs')).toBeTruthy();
  });

  it('unsave failing: the job comes back and the website text is shown', async () => {
    backend([job]);
    server.use(
      http.delete(`${API}/api/saved-jobs/${job.id}`, () =>
        HttpResponse.json({ error: 'x' }, { status: 500 }),
      ),
    );
    const { result } = await mount();
    result.current.toggle(job);
    expect(await screen.findByText('Failed to remove saved job')).toBeTruthy();
    expect(result.current.ids.has(job.id)).toBe(true);
  });

  it('409 "Job already saved" is not rolled back: the job is saved, which is what the user wanted', async () => {
    const saved = backend();
    server.use(
      http.post(`${API}/api/saved-jobs`, () => {
        saved.unshift(item(job)); // it was saved already, e.g. on another phone
        return HttpResponse.json({ error: 'Job already saved' }, { status: 409 });
      }),
    );
    const { result } = await mount();
    result.current.toggle(job);
    expect(await screen.findByText('Job saved')).toBeTruthy();
    expect(result.current.ids.has(job.id)).toBe(true);
  });

  it('404 "Saved job not found" on unsave stays removed', async () => {
    const saved = backend([job]);
    server.use(
      http.delete(`${API}/api/saved-jobs/${job.id}`, () => {
        saved.length = 0; // already removed elsewhere
        return HttpResponse.json({ error: 'Saved job not found' }, { status: 404 });
      }),
    );
    const { result } = await mount();
    result.current.toggle(job);
    expect(await screen.findByText('Removed from saved jobs')).toBeTruthy();
    expect(result.current.ids.has(job.id)).toBe(false);
  });

  it('a second tap on the same job while the first is in flight is ignored', async () => {
    backend();
    let posts = 0;
    server.use(
      http.post(`${API}/api/saved-jobs`, async () => {
        posts += 1;
        await delay(50);
        return HttpResponse.json(item(job), { status: 201 });
      }),
    );
    const { result } = await mount();
    result.current.toggle(job);
    result.current.toggle(job);
    await screen.findByText('Job saved');
    expect(posts).toBe(1);
  });

  it("a failure on one job does not undo another job's save", async () => {
    const saved = backend();
    server.use(
      http.post(`${API}/api/saved-jobs`, async ({ request }) => {
        const { jobId } = (await request.json()) as { jobId: string };
        if (jobId === job.id) {
          await delay(40);
          return HttpResponse.json({ error: 'x' }, { status: 500 });
        }
        saved.unshift(item(other));
        return HttpResponse.json(item(other), { status: 201 });
      }),
    );
    const { result } = await mount();
    result.current.toggle(job);
    result.current.toggle(other);
    await screen.findByText('Failed to save job');
    await waitFor(() => expect(result.current.ids.has(job.id)).toBe(false));
    expect(result.current.ids.has('other')).toBe(true);
  });

  it('puts the saved job at the top of the saved list (website order: newest first)', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    backend([other]);
    server.use(
      http.post(`${API}/api/saved-jobs`, async () => {
        await gate;
        return HttpResponse.json(item(job), { status: 201 });
      }),
    );
    const { result, queryClient } = await mount();
    result.current.toggle(job);
    await waitFor(() => expect(result.current.ids.has(job.id)).toBe(true));
    const list = queryClient.getQueryData<SavedJob[]>(SAVED_JOBS_KEY);
    expect(list?.map((s) => s.job.id)).toEqual([job.id, 'other']);
    release();
    await screen.findByText('Job saved');
  });
});
