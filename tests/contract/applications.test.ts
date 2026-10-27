// Apply and answer, against the local backend (Phase 3 Task 1). The tests change the demo applicant's applications,
// so they need a fresh seed first: stop the backend, `npm run backend:local -- --no-start`, start it again.
import { z } from 'zod';

import { ApplicationListSchema, ApplicationSchema } from '@/api/schemas/applications';
import { AuthResponseSchema } from '@/api/schemas/auth';
import { CandidateMeSchema } from '@/api/schemas/candidate';
import { JobSchema } from '@/api/schemas/jobs';
import { buildQuickApplyProfile } from '@/features/applications/logic/quickApplyProfile';

import { contractClient, SEED } from './backend';

const APP = (n: number) => `5eed0000-0000-4000-8000-00000000a10${n}`;
const JOB = (n: number) => `5eed0000-0000-4000-8000-00000000b00${n}`;
const RADIOLOGY = JOB(3); // has the five job questions
const NURSE = JOB(1);

// One login per account for the file: the login limiter allows 20 per 15 minutes per IP, shared by every file.
const logins = new Map<string, Promise<string>>();
async function clientFor(email: string) {
  if (!logins.has(email)) {
    logins.set(
      email,
      contractClient()
        .post('/api/auth/login', { email, password: SEED.password }, AuthResponseSchema)
        .then((r) => r.token),
    );
  }
  const client = contractClient();
  client.setAuthToken(await logins.get(email)!);
  return client;
}

const applicant = () => clientFor(SEED.applicantEmail);

async function quickApply(jobId: string, answers?: Record<string, unknown>) {
  const client = await applicant();
  const me = await client.get('/api/candidates/me', CandidateMeSchema);
  return client.post(
    '/api/applications',
    {
      jobId,
      cvSource: 'form',
      profile: buildQuickApplyProfile(me),
      ...(answers && Object.keys(answers).length > 0 ? { customFieldResponses: answers } : {}),
    },
    ApplicationSchema,
  );
}

const respond = async (id: string, status: string, note?: string) =>
  (await applicant()).patch(
    `/api/applications/${id}`,
    { status, ...(note ? { candidateResponseNote: note } : {}) },
    ApplicationSchema,
  );

beforeAll(async () => {
  const list = await (await applicant()).get('/api/applications', ApplicationListSchema);
  const interview = list.find((a) => a.id === APP(2));
  if (
    interview?.status !== 'InterviewScheduled' ||
    list.some((a) => a.job.id === RADIOLOGY || a.job.id === NURSE)
  ) {
    throw new Error(
      'The demo applicant is not in the seeded state. Stop the backend, run `npm run backend:local -- --no-start`, start it again, then rerun.',
    );
  }
});

describe('GET /api/applications', () => {
  it('parses the eight seeded applications, newest first, with their jobs', async () => {
    const list = await (await applicant()).get('/api/applications', ApplicationListSchema);
    expect(list).toHaveLength(8);
    expect(list.map((a) => a.status).sort()).toEqual([
      'Applied',
      'DocumentsRequested',
      'DocumentsUploaded',
      'InterviewScheduled',
      'InterviewScheduled',
      'JoiningConfirmed',
      'OfferSent',
      'Rejected',
    ]);
    const dates = list.map((a) => Date.parse(a.appliedOn ?? ''));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
    expect(list.every((a) => a.job.role && a.job.hospital)).toBe(true);
  });

  it('lists are real arrays: requested documents, submitted documents, offer link', async () => {
    const list = await (await applicant()).get('/api/applications', ApplicationListSchema);
    expect(list.find((a) => a.id === APP(4))?.requestedDocumentList).toHaveLength(3);
    expect(list.find((a) => a.id === APP(5))?.applicationDocuments).toHaveLength(1);
    expect(list.find((a) => a.id === APP(6))?.offerLetterUrl).toMatch(/^https:\/\/example\.org\//);
  });

  it('401 without a token', async () => {
    await expect(contractClient().get('/api/applications', ApplicationListSchema)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("the Phase 2 candidate sees none of the applicant's applications", async () => {
    const list = await (await clientFor(SEED.candidateEmail)).get('/api/applications', ApplicationListSchema);
    expect(list).toHaveLength(0);
  });
});

describe('job questions and candidate profile', () => {
  it('GET /api/jobs/:id carries the five questions of the Radiology Technician job', async () => {
    const job = await contractClient().get(`/api/jobs/${RADIOLOGY}`, JobSchema);
    expect(job.customApplicationFields.map((f) => f.type)).toEqual([
      'text',
      'textarea',
      'number',
      'select',
      'checkbox',
    ]);
    expect(job.customApplicationFields.find((f) => f.type === 'select')?.options).toEqual([
      'Morning',
      'Evening',
      'Night',
    ]);
  });

  it('the demo applicant has a form profile with completeness >= 30, the Phase 2 candidate has none', async () => {
    const mine = await (await applicant()).get('/api/candidates/me', CandidateMeSchema);
    expect(mine.cvSource).toBe('form');
    expect(mine.profile?.completeness).toBeGreaterThanOrEqual(30);
    const other = await (await clientFor(SEED.candidateEmail)).get('/api/candidates/me', CandidateMeSchema);
    expect(other.profile ?? null).toBeNull();
  });
});

describe('apply', () => {
  it('missing job answers: 400 with the backend sentence for the first required question', async () => {
    await expect(quickApply(RADIOLOGY, {})).rejects.toMatchObject({
      status: 400,
      serverMessage: '"Which imaging machines have you operated?" is required',
    });
  });

  it('a wrong answer type and a bad option are refused with the question named', async () => {
    await expect(
      quickApply(RADIOLOGY, { q_modality: 'CT', q_scans: 'many', q_shift: 'Morning', q_license: true }),
    ).rejects.toMatchObject({ status: 400, serverMessage: '"Scans you handle per day" must be a number' });
    await expect(
      quickApply(RADIOLOGY, { q_modality: 'CT', q_scans: 5, q_shift: 'Midnight', q_license: true }),
    ).rejects.toMatchObject({ status: 400, serverMessage: expect.stringContaining('Preferred shift') });
  });

  it('quick apply with answers: 201, status Applied, and the application is in the list', async () => {
    const row = await quickApply(RADIOLOGY, {
      q_modality: '128-slice CT',
      q_scans: 12,
      q_shift: 'Evening',
      q_license: true,
    });
    expect(row.status).toBe('Applied');
    expect(row.job.role).toBe('Radiology Technician');
    const list = await (await applicant()).get('/api/applications', ApplicationListSchema);
    expect(list).toHaveLength(9);
    expect(list.find((a) => a.id === row.id)).toBeDefined();
  });

  it('the same job again: 409 You have already applied to this job', async () => {
    await expect(
      quickApply(RADIOLOGY, { q_modality: 'CT', q_scans: 1, q_shift: 'Morning', q_license: true }),
    ).rejects.toMatchObject({ status: 409, serverMessage: 'You have already applied to this job' });
  });

  it('an unknown job is refused: 404', async () => {
    await expect(quickApply('5eed0000-0000-4000-8000-00000000e0ff')).rejects.toMatchObject({ status: 404 });
  });

  it('upload apply without a CV is refused before anything is stored', async () => {
    await expect(
      (await applicant()).post(
        '/api/applications',
        {
          jobId: NURSE,
          cvSource: 'upload',
          uploadedCv: { contact: { name: 'N N', email: 'a@b.test', phone: '9876500088' } },
        },
        ApplicationSchema,
      ),
    ).rejects.toMatchObject({ status: 400, serverMessage: 'CV file is required for upload applications' });
  });
});

describe('answer: interview, offer', () => {
  it('accept an interview: InterviewScheduled -> InterviewAccepted', async () => {
    expect((await respond(APP(2), 'InterviewAccepted')).status).toBe('InterviewAccepted');
  });

  it('reschedule without a note: 400 A reason is required to request a reschedule', async () => {
    await expect(respond(APP(3), 'RescheduleRequested')).rejects.toMatchObject({
      status: 400,
      serverMessage: 'A reason is required to request a reschedule',
    });
  });

  it('reschedule with a note: RescheduleRequested, the note is kept', async () => {
    const row = await respond(APP(3), 'RescheduleRequested', 'Free on Friday after 3 pm');
    expect(row.status).toBe('RescheduleRequested');
    expect(row.candidateResponseNote).toBe('Free on Friday after 3 pm');
  });

  it('accept the offer: OfferSent -> OfferAccepted; then it is final', async () => {
    expect((await respond(APP(6), 'OfferAccepted')).status).toBe('OfferAccepted');
    await expect(respond(APP(6), 'OfferRejected')).rejects.toMatchObject({
      status: 400,
      serverMessage: expect.stringMatching(/final and cannot be changed|Cannot move from/),
    });
  });

  it('a move the candidate may not make is refused with the allowed list', async () => {
    await expect(respond(APP(1), 'OfferAccepted')).rejects.toMatchObject({
      status: 400,
      serverMessage: expect.stringContaining('Cannot move from "Applied" to "OfferAccepted"'),
    });
  });

  it('an unknown application: 404', async () => {
    await expect(respond('5eed0000-0000-4000-8000-0000000000ff', 'OfferAccepted')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('another candidate cannot answer for the applicant: 403', async () => {
    const other = await clientFor(SEED.candidateEmail);
    await expect(
      other.patch(`/api/applications/${APP(4)}`, { status: 'DocumentsUploaded' }, z.unknown()),
    ).rejects.toMatchObject({ status: 403 });
  });
});
