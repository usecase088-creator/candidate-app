// Data hooks of Phase 3: list, quick apply, apply with CV, answers, requested documents.
// Real client, real hooks, MSW as the server (uploads through the XHR-over-fetch helper).
import { act, screen, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';

import {
  applicantMe,
  applied,
  documentsRequested,
  interviewVirtual,
  jobQuestions,
  offerSent,
  seededApplications,
} from '@/test/fixtures/applications';
import { API } from '@/test/msw/handlers';
import { installApplicationsBackend } from '@/test/msw/applications';
import { server } from '@/test/msw/server';
import { renderHookWithProviders } from '@/test/renderHookWithProviders';
import { installXhrOverFetch } from '@/test/xhrOverFetch';

import { CandidateMeSchema } from '@/api/schemas/candidate';
import { useApplications } from '../hooks/useApplications';
import { useApplyWithCv, useQuickApply } from '../hooks/useApply';
import { useRespond, useUploadRequestedDocuments } from '../hooks/useRespond';
import { APPLICATIONS_KEY } from '../hooks/queryKeys';

const me = CandidateMeSchema.parse(applicantMe);
const pdf = { uri: 'file:///cache/cv.pdf', name: 'cv.pdf', size: 1000, mime: 'application/pdf' };
const contact = { name: 'Demo Applicant', email: 'Applicant@Apronhanger.test', phone: '9876500088' };

let restoreXhr: () => void;
beforeAll(() => {
  restoreXhr = installXhrOverFetch();
});
afterAll(() => restoreXhr());

describe('useApplications', () => {
  it('loads the list, newest application first', async () => {
    installApplicationsBackend({ apps: [...seededApplications].reverse() });
    const { result } = await renderHookWithProviders(() => useApplications());
    await waitFor(() => expect(result.current.data).toHaveLength(8));
    const dates = (result.current.data ?? []).map((a) => Date.parse(a.appliedOn ?? ''));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it('a failed load is an error the screen can show', async () => {
    server.use(
      http.get(`${API}/api/applications`, () =>
        HttpResponse.json({ error: 'Internal server error' }, { status: 500 }),
      ),
    );
    const { result } = await renderHookWithProviders(() => useApplications());
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useQuickApply', () => {
  it('applies, tells the user "Application submitted!", and refreshes the list', async () => {
    const b = installApplicationsBackend({ apps: [] });
    const { result, queryClient } = await renderHookWithProviders(() => ({
      apply: useQuickApply(),
      list: useApplications(),
    }));
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    await act(async () => {
      await result.current.apply.mutateAsync({ jobId: 'job-1', me });
    });
    expect(await screen.findByText('Application submitted!')).toBeTruthy();
    expect(b.calls).toContain('POST /api/applications');
    await waitFor(() => expect(result.current.list.data).toHaveLength(1));
    expect(queryClient.getQueryState(APPLICATIONS_KEY)?.isInvalidated).toBe(false);
  });

  it('sends the answers to the job questions', async () => {
    const b = installApplicationsBackend({ apps: [] });
    const { result } = await renderHookWithProviders(() => useQuickApply());
    await act(async () => {
      await result.current.mutateAsync({ jobId: 'job-1', me, answers: { q_scans: 12 } });
    });
    expect(b.bodies[0]).toMatchObject({ jobId: 'job-1', customFieldResponses: { q_scans: 12 } });
  });

  it('"already applied" (409) shows the server sentence and refreshes the list so the screen can say so', async () => {
    const b = installApplicationsBackend({ apps: [{ ...applied, jobId: 'job-1' }] });
    const { result } = await renderHookWithProviders(() => ({
      apply: useQuickApply(),
      list: useApplications(),
    }));
    await act(async () => {
      await result.current.apply.mutateAsync({ jobId: 'job-1', me }).catch(() => undefined);
    });
    expect(await screen.findByText('You have already applied to this job')).toBeTruthy();
    expect(b.calls.filter((c) => c === 'GET /api/applications').length).toBeGreaterThanOrEqual(1);
  });

  it('another failure says "Failed to submit application" (never the raw server error)', async () => {
    server.use(
      http.post(`${API}/api/applications`, () =>
        HttpResponse.json({ error: 'Prisma exploded' }, { status: 500 }),
      ),
    );
    const { result } = await renderHookWithProviders(() => useQuickApply());
    await act(async () => {
      await result.current.mutateAsync({ jobId: 'job-1', me }).catch(() => undefined);
    });
    expect(await screen.findByText('Failed to submit application')).toBeTruthy();
    expect(screen.queryByText('Prisma exploded')).toBeNull();
  });

  it('a job-question refusal (400) shows the question named by the server', async () => {
    server.use(
      http.post(`${API}/api/applications`, () =>
        HttpResponse.json({ error: '"Scans" must be a number' }, { status: 400 }),
      ),
    );
    const { result } = await renderHookWithProviders(() => useQuickApply());
    await act(async () => {
      await result.current.mutateAsync({ jobId: 'job-1', me }).catch(() => undefined);
    });
    expect(await screen.findByText('"Scans" must be a number')).toBeTruthy();
  });

  it('no connection says so', async () => {
    server.use(http.post(`${API}/api/applications`, () => HttpResponse.error()));
    const { result } = await renderHookWithProviders(() => useQuickApply());
    await act(async () => {
      await result.current.mutateAsync({ jobId: 'job-1', me }).catch(() => undefined);
    });
    expect(
      await screen.findByText('Network error. Please check your connection and try again.'),
    ).toBeTruthy();
  });

  it('a second tap while the first request runs does not send a second one', async () => {
    let posts = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    server.use(
      http.post(`${API}/api/applications`, async () => {
        posts += 1;
        await gate;
        return HttpResponse.json(applied, { status: 201 });
      }),
      http.get(`${API}/api/applications`, () => HttpResponse.json([])),
    );
    const { result } = await renderHookWithProviders(() => useQuickApply());
    await act(async () => {
      result.current.mutate({ jobId: 'job-1', me });
      result.current.mutate({ jobId: 'job-1', me });
    });
    await act(async () => {
      release();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(posts).toBe(1);
  });
});

describe('useApplyWithCv', () => {
  it('uploads the CV, then applies with it, and tells the user "Application submitted with your CV!"', async () => {
    const b = installApplicationsBackend({ apps: [] });
    const { result } = await renderHookWithProviders(() => useApplyWithCv());
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.submit({
        jobId: 'job-2',
        file: pdf,
        contact,
        answers: { q_modality: 'CT' },
      });
    });
    expect(outcome).toEqual({ ok: true });
    expect(b.calls).toEqual(['POST /api/upload/cv', 'POST /api/applications']);
    expect(b.forms[0]).toEqual(['cv']);
    expect(b.bodies[0]).toMatchObject({
      jobId: 'job-2',
      cvSource: 'upload',
      cvUrl: 'https://example.org/cv/uploaded.pdf',
      cvCloudinaryId: 'candidates/cv/test_1',
      cvName: 'uploaded.pdf',
      cvMime: 'application/pdf',
      // exactly as typed
      uploadedCv: { contact: { email: 'Applicant@Apronhanger.test' } },
      customFieldResponses: { q_modality: 'CT' },
    });
    expect(await screen.findByText('Application submitted with your CV!')).toBeTruthy();
    expect(result.current.status).toEqual({ state: 'idle', progress: 0 });
  });

  it('a file the app refuses is never sent, and the reason is shown with the file', async () => {
    const b = installApplicationsBackend({ apps: [] });
    const { result } = await renderHookWithProviders(() => useApplyWithCv());
    await act(async () => {
      await result.current.submit({
        jobId: 'job-2',
        file: { ...pdf, name: 'photo.jpg', mime: 'image/jpeg' },
        contact,
      });
    });
    expect(b.calls).toEqual([]);
    expect(result.current.status).toMatchObject({
      state: 'error',
      message: 'Please upload a PDF or Word document (.pdf, .doc, .docx)',
    });
  });

  it('when the upload fails, nothing is applied and "try again" can run it again', async () => {
    const b = installApplicationsBackend({ apps: [] });
    server.use(
      http.post(`${API}/api/upload/cv`, () =>
        HttpResponse.json({ error: 'Invalid file type.' }, { status: 400 }),
      ),
    );
    const { result } = await renderHookWithProviders(() => useApplyWithCv());
    await act(async () => {
      await result.current.submit({ jobId: 'job-2', file: pdf, contact });
    });
    expect(result.current.status).toMatchObject({ state: 'error', message: 'Invalid file type.' });
    expect(b.calls).not.toContain('POST /api/applications');
    installApplicationsBackend({ apps: [] });
    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.status.state).toBe('idle');
  });

  it('when the CV went up but the application is refused, retry does not upload the file again', async () => {
    const b = installApplicationsBackend({ apps: [] });
    let applyCalls = 0;
    server.use(
      http.post(`${API}/api/applications`, async () => {
        applyCalls += 1;
        return applyCalls === 1
          ? HttpResponse.json({ error: '"Preferred shift": choose a valid option' }, { status: 400 })
          : HttpResponse.json(applied, { status: 201 });
      }),
    );
    const { result } = await renderHookWithProviders(() => useApplyWithCv());
    await act(async () => {
      await result.current.submit({ jobId: 'job-2', file: pdf, contact });
    });
    expect(result.current.status).toMatchObject({
      state: 'error',
      message: '"Preferred shift": choose a valid option',
    });
    await act(async () => {
      await result.current.retry();
    });
    expect(b.calls.filter((c) => c === 'POST /api/upload/cv')).toHaveLength(1);
    expect(applyCalls).toBe(2);
    expect(await screen.findByText('Application submitted with your CV!')).toBeTruthy();
  });

  it('"already applied" (409) is shown as the server says, and refreshes the list', async () => {
    installApplicationsBackend({ apps: [{ ...applied, jobId: 'job-2' }] });
    const { result } = await renderHookWithProviders(() => useApplyWithCv());
    await act(async () => {
      await result.current.submit({ jobId: 'job-2', file: pdf, contact });
    });
    expect(result.current.status).toMatchObject({
      state: 'error',
      message: 'You have already applied to this job',
    });
  });

  it('cancel while uploading stops it, applies nothing and leaves no error', async () => {
    const b = installApplicationsBackend({ apps: [] });
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    server.use(
      http.post(`${API}/api/upload/cv`, async () => {
        await gate;
        return HttpResponse.json({ url: 'u', publicId: 'p' });
      }),
    );
    const { result } = await renderHookWithProviders(() => useApplyWithCv());
    let outcome: unknown;
    await act(async () => {
      void result.current.submit({ jobId: 'job-2', file: pdf, contact }).then((o) => (outcome = o));
    });
    await waitFor(() => expect(result.current.status.state).toBe('uploading'));
    await act(async () => {
      result.current.cancel();
    });
    await waitFor(() => expect(result.current.status.state).toBe('idle'));
    release();
    expect(b.calls).not.toContain('POST /api/applications');
    await waitFor(() => expect(outcome).toEqual({ ok: false, cancelled: true }));
  });
});

describe('useRespond', () => {
  it('accepts an interview: the row changes, "Response recorded successfully!", the list is refreshed', async () => {
    const b = installApplicationsBackend({ apps: [{ ...interviewVirtual }] });
    const { result } = await renderHookWithProviders(() => ({
      respond: useRespond(),
      list: useApplications(),
    }));
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    await act(async () => {
      await result.current.respond.mutateAsync({ id: interviewVirtual.id, status: 'InterviewAccepted' });
    });
    expect(await screen.findByText('Response recorded successfully!')).toBeTruthy();
    expect(b.bodies[0]).toEqual({ status: 'InterviewAccepted' });
    await waitFor(() => expect(result.current.list.data?.[0]?.status).toBe('InterviewAccepted'));
  });

  it('a reschedule request sends the note', async () => {
    const b = installApplicationsBackend({ apps: [{ ...interviewVirtual }] });
    const { result } = await renderHookWithProviders(() => useRespond());
    await act(async () => {
      await result.current.mutateAsync({
        id: interviewVirtual.id,
        status: 'RescheduleRequested',
        note: 'Friday after 3 pm',
      });
    });
    expect(b.bodies[0]).toEqual({
      status: 'RescheduleRequested',
      candidateResponseNote: 'Friday after 3 pm',
    });
  });

  it('a refused move shows "Failed to update status" and the server\'s reason, and refreshes the list', async () => {
    const b = installApplicationsBackend({ apps: [{ ...offerSent, status: 'OfferAccepted' }] });
    const { result } = await renderHookWithProviders(() => ({
      respond: useRespond(),
      list: useApplications(),
    }));
    await act(async () => {
      await result.current.respond
        .mutateAsync({ id: offerSent.id, status: 'OfferRejected' })
        .catch(() => undefined);
    });
    expect(
      await screen.findByText(
        'Failed to update status: Cannot move from "OfferAccepted" to "OfferRejected" as CANDIDATE. Allowed: none.',
      ),
    ).toBeTruthy();
    expect(b.calls.filter((c) => c === 'GET /api/applications').length).toBeGreaterThanOrEqual(1);
  });

  it('a server error says only "Failed to update status"', async () => {
    server.use(
      http.patch(`${API}/api/applications/x`, () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
    );
    const { result } = await renderHookWithProviders(() => useRespond());
    await act(async () => {
      await result.current.mutateAsync({ id: 'x', status: 'OfferAccepted' }).catch(() => undefined);
    });
    expect(await screen.findByText('Failed to update status')).toBeTruthy();
  });

  it('no connection says so', async () => {
    server.use(http.patch(`${API}/api/applications/x`, () => HttpResponse.error()));
    const { result } = await renderHookWithProviders(() => useRespond());
    await act(async () => {
      await result.current.mutateAsync({ id: 'x', status: 'OfferAccepted' }).catch(() => undefined);
    });
    expect(
      await screen.findByText('Network error. Please check your connection and try again.'),
    ).toBeTruthy();
  });

  it('a second tap on the same application while the first request runs is ignored', async () => {
    let patches = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    server.use(
      http.patch(`${API}/api/applications/a1`, async () => {
        patches += 1;
        await gate;
        return HttpResponse.json({ ...interviewVirtual, status: 'OfferAccepted' });
      }),
      http.get(`${API}/api/applications`, () => HttpResponse.json([])),
    );
    const { result } = await renderHookWithProviders(() => useRespond());
    await act(async () => {
      result.current.mutate({ id: 'a1', status: 'OfferAccepted' });
      result.current.mutate({ id: 'a1', status: 'OfferAccepted' });
    });
    await act(async () => {
      release();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(patches).toBe(1);
  });
});

describe('useUploadRequestedDocuments', () => {
  const photo = { uri: 'file:///cache/p.jpg', name: 'p.jpg', size: 2000, mime: 'image/jpeg' };

  it('uploads the files in the field "documents", says "Documents uploaded successfully!" and refreshes the list', async () => {
    const b = installApplicationsBackend({ apps: [{ ...documentsRequested }] });
    const { result } = await renderHookWithProviders(() => ({
      up: useUploadRequestedDocuments(),
      list: useApplications(),
    }));
    // Read `data` first: TanStack Query only re-renders for the props that were read (a screen reads it in render).
    await waitFor(() => expect(result.current.list.data?.[0]?.status).toBe('DocumentsRequested'));
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.up.submit(documentsRequested.id, [pdf, photo]);
    });
    expect(outcome).toEqual({ ok: true });
    expect(b.forms[0]).toEqual(['documents']);
    expect(await screen.findByText('Documents uploaded successfully!')).toBeTruthy();
    await waitFor(() => expect(result.current.list.data?.[0]?.status).toBe('DocumentsUploaded'));
  });

  it('a file the app refuses is never sent; the reason is shown with the field', async () => {
    const b = installApplicationsBackend({ apps: [{ ...documentsRequested }] });
    const { result } = await renderHookWithProviders(() => useUploadRequestedDocuments());
    await act(async () => {
      await result.current.submit(documentsRequested.id, [
        { ...pdf, name: 'big.pdf', size: 6 * 1024 * 1024 },
      ]);
    });
    expect(b.calls).toEqual([]);
    expect(result.current.status).toMatchObject({
      state: 'error',
      message: '"big.pdf" exceeds 5MB. Please use a smaller file.',
    });
  });

  it('a server refusal keeps its words in the field, and retry sends the same files again', async () => {
    installApplicationsBackend({ apps: [{ ...documentsRequested }] });
    let calls = 0;
    server.use(
      http.post(`${API}/api/applications/:id/documents`, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(
              { error: 'Invalid file type: text/plain. Only PDF, JPEG, PNG, and WebP are allowed.' },
              { status: 400 },
            )
          : HttpResponse.json([{ id: 'd', name: 'cv.pdf', url: 'https://example.org/x.pdf' }], {
              status: 201,
            });
      }),
      http.get(`${API}/api/applications`, () => HttpResponse.json([])),
    );
    const { result } = await renderHookWithProviders(() => useUploadRequestedDocuments());
    await act(async () => {
      await result.current.submit('a1', [pdf]);
    });
    expect(result.current.status).toMatchObject({
      state: 'error',
      message: 'Invalid file type: text/plain. Only PDF, JPEG, PNG, and WebP are allowed.',
    });
    await act(async () => {
      await result.current.retry();
    });
    expect(calls).toBe(2);
    expect(result.current.status.state).toBe('idle');
  });

  it('a server error says "Failed to upload documents"', async () => {
    server.use(
      http.post(`${API}/api/applications/:id/documents`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    );
    const { result } = await renderHookWithProviders(() => useUploadRequestedDocuments());
    await act(async () => {
      await result.current.submit('a1', [pdf]);
    });
    expect(result.current.status).toMatchObject({ state: 'error', message: 'Failed to upload documents' });
  });
});

describe('job questions fixture', () => {
  it('has the five types the apply screens must handle', () => {
    expect(jobQuestions.map((q) => q.type)).toEqual(['text', 'textarea', 'number', 'select', 'checkbox']);
  });
});
