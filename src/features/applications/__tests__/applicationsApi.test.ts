import { http, HttpResponse } from 'msw';

import { CandidateMeSchema } from '@/api/schemas/candidate';
import { applicantMe, interviewVirtual, seededApplications } from '@/test/fixtures/applications';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';

import { applicationsApi, buildQuickApplyProfile } from '../applicationsApi';

type Seen = { method: string; url: URL; body?: unknown; auth?: string | null };

/** Records every request to `path` and answers with `reply`. */
function record(method: 'get' | 'post' | 'patch', path: string, reply: unknown, status = 200) {
  const seen: Seen[] = [];
  server.use(
    http[method](`${API}${path}`, async ({ request }) => {
      seen.push({
        method: request.method,
        url: new URL(request.url),
        body: method === 'get' ? undefined : await request.json(),
        auth: request.headers.get('authorization'),
      });
      return HttpResponse.json(reply as never, { status });
    }),
  );
  return seen;
}

const me = CandidateMeSchema.parse(applicantMe);

describe('list', () => {
  it('GET /api/applications with no query (a bare array, newest first, at most 50)', async () => {
    const seen = record('get', '/api/applications', seededApplications);
    const list = await applicationsApi.list();
    expect(list).toHaveLength(8);
    expect(seen[0]?.url.search).toBe('');
  });

  it('a failure is an ApiError with the status and the backend message', async () => {
    record('get', '/api/applications', { error: 'Internal server error' }, 500);
    await expect(applicationsApi.list()).rejects.toMatchObject({ kind: 'http', status: 500 });
  });

  it('a row without a status is a parse error (the backend shape changed)', async () => {
    record('get', '/api/applications', [{ id: 'x', job: { id: 'j', role: 'R', hospital: 'H' } }]);
    await expect(applicationsApi.list()).rejects.toMatchObject({ kind: 'parse' });
  });
});

describe('buildQuickApplyProfile', () => {
  it('sends back the profile the server gave us, with the CV and avatar fields the website adds, and nothing removed', () => {
    const profile = buildQuickApplyProfile({
      ...me,
      cvUrl: 'https://x.test/cv.pdf',
      avatarUrl: 'https://x.test/a.png',
      avatarCloudinaryId: 'av1',
      uploadedCvName: 'cv.pdf',
    });
    expect(profile).toMatchObject({
      name: 'Demo Applicant',
      completeness: 94,
      futureFlag: { keep: 'me' },
      cvUrl: 'https://x.test/cv.pdf',
      avatarUrl: 'https://x.test/a.png',
      avatarCloudinaryId: 'av1',
      uploadedCvName: 'cv.pdf',
      cvSource: 'form',
    });
  });

  it('keeps the avatar already inside the profile when the row has none (website: data.avatarUrl || profile.avatarUrl)', () => {
    const withAvatar = CandidateMeSchema.parse({
      ...applicantMe,
      avatarUrl: null,
      profile: { ...applicantMe.profile, avatarUrl: 'https://x.test/inside.png' },
    });
    expect(buildQuickApplyProfile(withAvatar)).toMatchObject({ avatarUrl: 'https://x.test/inside.png' });
  });

  it('does not change the row it was given', () => {
    const before = JSON.stringify(me);
    buildQuickApplyProfile(me);
    expect(JSON.stringify(me)).toBe(before);
  });

  it('throws when the candidate has no profile (the screen never offers quick apply then)', () => {
    expect(() => buildQuickApplyProfile({ ...me, profile: null })).toThrow(/profile/i);
  });
});

describe('quickApply', () => {
  it('POST /api/applications { jobId, cvSource: "form", profile } with the token, nothing else', async () => {
    const seen = record('post', '/api/applications', { ...interviewVirtual, status: 'Applied' }, 201);
    const row = await applicationsApi.quickApply('job-1', me);
    expect(row.status).toBe('Applied');
    expect(seen[0]?.method).toBe('POST');
    expect(seen[0]?.body).toEqual({
      jobId: 'job-1',
      cvSource: 'form',
      profile: expect.objectContaining({ name: 'Demo Applicant', futureFlag: { keep: 'me' } }),
    });
  });

  it('sends the answers to the job questions only when there are some', async () => {
    const seen = record('post', '/api/applications', interviewVirtual, 201);
    await applicationsApi.quickApply('job-1', me, {});
    await applicationsApi.quickApply('job-1', me, { q_scans: 12, q_license: false, q_shift: 'Night' });
    expect(seen[0]?.body).not.toHaveProperty('customFieldResponses');
    expect(seen[1]?.body).toMatchObject({
      customFieldResponses: { q_scans: 12, q_license: false, q_shift: 'Night' },
    });
  });

  it('409 keeps the backend message and is recognised as "already applied"', async () => {
    record('post', '/api/applications', { error: 'You have already applied to this job' }, 409);
    const error = await applicationsApi.quickApply('job-1', me).catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 409, serverMessage: 'You have already applied to this job' });
  });

  it('a 400 job-question error keeps the backend text', async () => {
    record('post', '/api/applications', { error: '"Scans you handle per day" must be a number' }, 400);
    await expect(applicationsApi.quickApply('job-1', me, { q_scans: 'x' as never })).rejects.toMatchObject({
      status: 400,
      serverMessage: '"Scans you handle per day" must be a number',
    });
  });

  it('a write is never repeated on a network error', async () => {
    let calls = 0;
    server.use(
      http.post(`${API}/api/applications`, () => {
        calls += 1;
        return HttpResponse.error();
      }),
    );
    await expect(applicationsApi.quickApply('job-1', me)).rejects.toMatchObject({ kind: 'network' });
    expect(calls).toBe(1);
  });
});

describe('applyWithCv', () => {
  const cv = {
    url: 'https://res.example.test/cv.pdf',
    publicId: 'cv/abc',
    name: 'my-cv.pdf',
    mime: 'application/pdf',
  };

  it('POST /api/applications { cvSource: "upload", cvUrl, cvCloudinaryId, cvName, cvMime, uploadedCv: { contact } }', async () => {
    const seen = record('post', '/api/applications', interviewVirtual, 201);
    await applicationsApi.applyWithCv('job-2', cv, {
      name: 'Demo Applicant',
      email: 'Applicant@Apronhanger.TEST',
      phone: '9876500088',
    });
    expect(seen[0]?.body).toEqual({
      jobId: 'job-2',
      cvSource: 'upload',
      cvUrl: cv.url,
      cvCloudinaryId: 'cv/abc',
      cvName: 'my-cv.pdf',
      cvMime: 'application/pdf',
      // the email goes exactly as typed (no lowercasing, no trimming of case)
      uploadedCv: {
        contact: { name: 'Demo Applicant', email: 'Applicant@Apronhanger.TEST', phone: '9876500088' },
      },
    });
  });

  it('adds the job answers when there are some', async () => {
    const seen = record('post', '/api/applications', interviewVirtual, 201);
    await applicationsApi.applyWithCv(
      'job-2',
      cv,
      { name: 'N N', email: 'a@b.test', phone: '9876500088' },
      { q_modality: 'CT' },
    );
    expect(seen[0]?.body).toMatchObject({ customFieldResponses: { q_modality: 'CT' } });
  });

  it('falls back to the uploaded file name and type when the server sends none', async () => {
    const seen = record('post', '/api/applications', interviewVirtual, 201);
    await applicationsApi.applyWithCv(
      'job-2',
      { url: cv.url, publicId: 'cv/abc' },
      { name: 'N N', email: 'a@b.test', phone: '9876500088' },
      undefined,
      { name: 'picked.pdf', mime: 'application/pdf' },
    );
    expect(seen[0]?.body).toMatchObject({ cvName: 'picked.pdf', cvMime: 'application/pdf' });
  });
});

describe('respond', () => {
  it('PATCH /api/applications/:id { status }', async () => {
    const seen = record('patch', '/api/applications/app-1', {
      ...interviewVirtual,
      status: 'InterviewAccepted',
    });
    const row = await applicationsApi.respond('app-1', 'InterviewAccepted');
    expect(row.status).toBe('InterviewAccepted');
    expect(seen[0]?.method).toBe('PATCH');
    expect(seen[0]?.body).toEqual({ status: 'InterviewAccepted' });
  });

  it('a reschedule request carries the note, trimmed', async () => {
    const seen = record('patch', '/api/applications/app-1', {
      ...interviewVirtual,
      status: 'RescheduleRequested',
    });
    await applicationsApi.respond('app-1', 'RescheduleRequested', '  Free on Friday after 3 pm  ');
    expect(seen[0]?.body).toEqual({
      status: 'RescheduleRequested',
      candidateResponseNote: 'Free on Friday after 3 pm',
    });
  });

  it('the id is URL-encoded', async () => {
    const seen = record('patch', '/api/applications/a%20b', interviewVirtual);
    await applicationsApi.respond('a b', 'OfferAccepted');
    expect(seen[0]?.url.pathname).toBe('/api/applications/a%20b');
  });

  it('a refused move (400) keeps the backend sentence', async () => {
    record(
      'patch',
      '/api/applications/app-1',
      { error: 'Application status "OfferAccepted" is final and cannot be changed.' },
      400,
    );
    await expect(applicationsApi.respond('app-1', 'OfferRejected')).rejects.toMatchObject({
      status: 400,
      serverMessage: 'Application status "OfferAccepted" is final and cannot be changed.',
    });
  });

  it('403 and 404 are ApiErrors', async () => {
    record('patch', '/api/applications/x', { error: 'Application not found' }, 404);
    await expect(applicationsApi.respond('x', 'OfferAccepted')).rejects.toMatchObject({ status: 404 });
  });
});
