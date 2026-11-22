// Apply through the structured form (website routes/apply.$jobId.form.tsx + ProfileFormWizard applyMode): the same
// steps, the job's questions on the Review step, "Submit application", the first picked vault file as this job's CV.
import * as DocumentPicker from 'expo-document-picker';
import { useFonts } from 'expo-font';
import { fireEvent, screen, within } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import type { CandidateMe } from '@/api/schemas/candidate';
import { loadDraft, saveDraft } from '@/features/profile/builder/draftStore';
import { draftFromMe } from '@/features/profile/builder/model';
import { applicantMe, applied, jobQuestions } from '@/test/fixtures/applications';
import { candidateUser } from '@/test/fixtures/auth';
import { fakeFiles, resetFakeFiles } from '@/test/fakeFileSystem';
import { installApplicationsBackend } from '@/test/msw/applications';
import { API } from '@/test/msw/handlers';
import { installJobsBackend, makeJob } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';
import { installXhrOverFetch } from '@/test/xhrOverFetch';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
}));
jest.mock('expo-file-system', () => jest.requireActual('@/test/fakeFileSystem').fakeFileSystemModule);
jest.mock('@react-native-community/datetimepicker', () => jest.requireActual('@/test/fakeDateTimePicker'));

const DOCTOR =
  'Clinical Practitioners & Super Specialists (MBBS/ MD Physician/ MD/MS / DM / MCh / DNB-SS etc)';

// A saved profile that passes every step, so the tests can walk to the Review step.
const fullProfile = {
  ...applicantMe.profile,
  someOtherKey: 'keep me',
  role: DOCTOR,
  specialty: 'Cardiology',
  state: 'West Bengal',
  registrationCouncil: 'NMC',
  registrationNumber: 'WB/1',
  licenseStatus: 'Active',
  qualifications: [{ degree: 'MBBS', institution: 'CMC', year: '2012' }],
  experience: [
    {
      role: 'Consultant',
      hospital: 'AMRI',
      city: 'Kolkata',
      start: '2020-01-01',
      end: '',
      current: true,
      specialty: 'Cardiology',
      summary: '',
    },
  ],
  clinicalSkills: ['PTCA'],
  summary: 'Consultant cardiologist with seven years of tertiary-care experience.',
};
const me = { ...applicantMe, profile: fullProfile };

const job = makeJob({ id: 'job-1', role: 'Radiology Technician', hospital: 'Seed Valley Care Centre' });
const jobWithQuestions = { ...job, customApplicationFields: jobQuestions } as typeof job;

let puts: number;
function setup(over: { jobs?: unknown[]; me?: unknown; apps?: unknown[] } = {}) {
  puts = 0;
  installJobsBackend({ jobs: (over.jobs ?? [job]) as never, me: over.me ?? me });
  const apps = installApplicationsBackend({ apps: (over.apps ?? []) as never });
  server.use(
    http.put(`${API}/api/candidates/me`, () => {
      puts += 1;
      return HttpResponse.json(me);
    }),
  );
  return apps;
}
const open = () => startSignedIn('/apply/job-1/form', 'apply.form.screen');
const next = async () => fireEvent.press(await screen.findByTestId('builder.next'));
async function toStep(index: number) {
  await screen.findByTestId('builder.progress');
  for (let i = 0; i < index; i++) await next();
  expect(await screen.findByTestId('builder.progress')).toHaveTextContent(`Step ${index + 1} of 16`);
}
const REVIEW = 15;
const VAULT = 14;
const pickPdf = (name: string) => {
  fakeFiles.set(`file:///cache/${name}`, 'pdf-bytes');
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({
    canceled: false,
    assets: [{ uri: `file:///cache/${name}`, name, size: 1000, mimeType: 'application/pdf' }],
  } as never);
};
/** Answers every required question of `jobQuestions`. */
async function answerAll() {
  await fireEvent.changeText(screen.getByTestId('builder.questions.q_modality'), 'CT');
  await fireEvent.changeText(screen.getByTestId('builder.questions.q_scans'), '12');
  await fireEvent.press(screen.getByTestId('builder.questions.q_shift.option.1'));
  await fireEvent.press(screen.getByTestId('builder.questions.q_license.yes'));
}

let restoreXhr: () => void;
beforeAll(() => {
  restoreXhr = installXhrOverFetch();
});
afterAll(() => restoreXhr());
beforeEach(() => {
  resetAppState();
  resetFakeFiles();
  jest.mocked(useFonts).mockReturnValue([true, null]);
});

describe('Apply with the structured form: the form', () => {
  it('opens the profile form for this job at step 1, with the job it applies to', async () => {
    setup();
    await open();
    expect(await screen.findByTestId('builder.progress')).toHaveTextContent('Step 1 of 16');
    expect(screen.getByTestId('builder.field.fullName')).toHaveProp('value', 'Demo Applicant');
    const to = within(screen.getByTestId('builder.applyingTo'));
    expect(to.getByText('Applying to')).toBeOnTheScreen();
    expect(to.getByText('Radiology Technician · Seed Valley Care Centre')).toBeOnTheScreen();
  });

  it('"Edit & apply" on the chooser opens it', async () => {
    setup();
    await startSignedIn('/apply/job-1', 'apply.screen');
    await fireEvent.press(await screen.findByTestId('apply.choice.form'));
    expect(await screen.findByTestId('apply.form.screen')).toBeOnTheScreen();
    expect(await screen.findByTestId('builder.progress')).toHaveTextContent('Step 1 of 16');
  });

  it('already applied: the website "Already applied" screen, no form', async () => {
    setup({ apps: [{ ...applied, jobId: 'job-1' }] });
    await open();
    expect(await screen.findByTestId('apply.form.applied')).toBeOnTheScreen();
    expect(
      screen.getByText('You have already submitted an application for Radiology Technician.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('builder.progress')).toBeNull();
  });

  it('the vault step says the file goes with this job only (website wording)', async () => {
    setup();
    await open();
    await toStep(VAULT);
    expect(screen.getByText('Attach a CV or supporting document for this job')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Documents uploaded here are attached only to this job application. Your saved CV profile keeps the document readiness checklist.',
      ),
    ).toBeOnTheScreen();
  });

  it('Review shows the job questions, the attachment and the answers, and the button reads "Submit application"', async () => {
    setup({ jobs: [jobWithQuestions] });
    await open();
    await toStep(REVIEW);
    expect(screen.getByTestId('builder.questions')).toBeOnTheScreen();
    expect(screen.getByText('Which imaging machines have you operated?')).toBeOnTheScreen();
    expect(screen.getByTestId('builder.review.attachment')).toHaveTextContent('None');
    expect(within(screen.getByTestId('builder.submit')).getByText('Submit application')).toBeOnTheScreen();
    await answerAll();
    expect(screen.getByTestId('builder.review.answer.q_license')).toHaveTextContent('Yes');
    expect(screen.getByTestId('builder.review.answer.q_shift')).toHaveTextContent('Evening');
    expect(screen.getByTestId('builder.review.answer.q_notes')).toHaveTextContent('—');
  });
});

describe('Apply with the structured form: submit', () => {
  it('sends the form profile and the answers, saves no profile, says "Application submitted!" and opens My Applications', async () => {
    const apps = setup({ jobs: [jobWithQuestions] });
    await open();
    await toStep(REVIEW);
    await answerAll();
    await fireEvent.press(screen.getByTestId('builder.submit'));
    expect(await screen.findByText('Application submitted!')).toBeOnTheScreen();
    expect(await screen.findByTestId('applications.screen')).toBeOnTheScreen();
    expect(apps.bodies[0]).toMatchObject({
      jobId: 'job-1',
      cvSource: 'form',
      profile: { name: 'Demo Applicant', someOtherKey: 'keep me', specialty: 'Cardiology' },
      customFieldResponses: { q_modality: 'CT', q_scans: 12, q_shift: 'Evening', q_license: true },
    });
    expect(apps.bodies[0]).not.toHaveProperty('cvUrl');
    expect(apps.calls).not.toContain('POST /api/upload/cv');
    expect(puts).toBe(0);
  });

  it('leaves the normal profile draft on the phone alone', async () => {
    setup();
    const draft = { step: 3, draft: draftFromMe(me as CandidateMe), pending: [], uploaded: [] };
    await saveDraft(candidateUser.id, draft);
    await open();
    expect(await screen.findByTestId('builder.progress')).toHaveTextContent('Step 1 of 16');
    await toStep(REVIEW);
    await fireEvent.press(screen.getByTestId('builder.submit'));
    expect(await screen.findByTestId('applications.screen')).toBeOnTheScreen();
    expect(await loadDraft(candidateUser.id)).toEqual(draft);
  });

  it('uploads the picked file as this job\'s CV, then applies with it', async () => {
    const apps = setup();
    pickPdf('my-cv.pdf');
    await open();
    await toStep(VAULT);
    await fireEvent.press(screen.getByTestId('builder.vault.add'));
    expect(await screen.findByText('my-cv.pdf')).toBeOnTheScreen();
    await next();
    expect(screen.getByTestId('builder.review.attachment')).toHaveTextContent('my-cv.pdf');
    await fireEvent.press(screen.getByTestId('builder.submit'));
    expect(await screen.findByTestId('applications.screen')).toBeOnTheScreen();
    expect(apps.calls.filter((c) => c.startsWith('POST'))).toEqual(['POST /api/upload/cv', 'POST /api/applications']);
    expect(apps.bodies[0]).toMatchObject({
      cvSource: 'form',
      cvUrl: 'https://example.org/cv/uploaded.pdf',
      cvCloudinaryId: 'candidates/cv/test_1',
      cvName: 'uploaded.pdf',
      cvMime: 'application/pdf',
    });
  });

  it('a missing answer is shown under its question and nothing is sent', async () => {
    const apps = setup({ jobs: [jobWithQuestions] });
    await open();
    await toStep(REVIEW);
    await fireEvent.press(screen.getByTestId('builder.submit'));
    expect(await screen.findByTestId('builder.questions.q_modality.error')).toHaveTextContent(
      '"Which imaging machines have you operated?" is required',
    );
    expect(apps.bodies).toHaveLength(0);
  });

  it('the server refusal is shown with the website sentence and the form stays', async () => {
    setup();
    server.use(
      http.post(`${API}/api/applications`, () =>
        HttpResponse.json({ error: 'This job is no longer accepting applications' }, { status: 400 }),
      ),
    );
    await open();
    await toStep(REVIEW);
    await fireEvent.press(screen.getByTestId('builder.submit'));
    expect(await screen.findByText('This job is no longer accepting applications')).toBeOnTheScreen();
    expect(screen.getByTestId('builder.progress')).toHaveTextContent('Step 16 of 16');
  });

  it('a 413 says the website sentence', async () => {
    setup();
    server.use(http.post(`${API}/api/applications`, () => HttpResponse.json({}, { status: 413 })));
    await open();
    await toStep(REVIEW);
    await fireEvent.press(screen.getByTestId('builder.submit'));
    expect(
      await screen.findByText(
        'CV file is too large for upload. Try a smaller PDF (under 4MB) or use the form application.',
      ),
    ).toBeOnTheScreen();
  });

  it('a server error says "Failed to submit application", never the raw text', async () => {
    setup();
    server.use(
      http.post(`${API}/api/applications`, () => HttpResponse.json({ error: 'db exploded' }, { status: 500 })),
    );
    await open();
    await toStep(REVIEW);
    await fireEvent.press(screen.getByTestId('builder.submit'));
    expect(await screen.findByText('Failed to submit application')).toBeOnTheScreen();
    expect(screen.queryByText(/db exploded/)).toBeNull();
  });

  it('a retry after a refused application does not upload the CV again', async () => {
    const apps = setup();
    let refuse = true;
    server.use(
      http.post(`${API}/api/applications`, ({ request }) => {
        apps.calls.push(`POST ${new URL(request.url).pathname}`);
        if (refuse) return HttpResponse.json({ error: 'Try again' }, { status: 400 });
        return HttpResponse.json(applied as never, { status: 201 });
      }),
    );
    pickPdf('my-cv.pdf');
    await open();
    await toStep(VAULT);
    await fireEvent.press(screen.getByTestId('builder.vault.add'));
    await screen.findByText('my-cv.pdf');
    await next();
    await fireEvent.press(screen.getByTestId('builder.submit'));
    expect(await screen.findByText('Try again')).toBeOnTheScreen();
    refuse = false;
    await fireEvent.press(screen.getByTestId('builder.submit'));
    expect(await screen.findByTestId('applications.screen')).toBeOnTheScreen();
    expect(apps.calls.filter((c) => c === 'POST /api/upload/cv')).toHaveLength(1);
  });
});
