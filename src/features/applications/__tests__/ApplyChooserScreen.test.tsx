import { onlineManager } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Network from 'expo-network';
import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { delay, http, HttpResponse } from 'msw';

import { applicantMe, applied, jobQuestions } from '@/test/fixtures/applications';
import { installApplicationsBackend } from '@/test/msw/applications';
import { API } from '@/test/msw/handlers';
import { installJobsBackend, makeJob } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

const job = makeJob({
  id: 'job-1',
  role: 'Radiology Technician',
  hospital: 'Seed Valley Care Centre',
  hospitalVerified: true,
  location: 'Bengaluru, Karnataka',
  city: 'Bengaluru',
});
const jobWithQuestions = { ...job, customApplicationFields: jobQuestions } as typeof job;
const noProfile = {
  id: 'c1',
  name: 'Test Candidate',
  email: 'candidate@apronhanger.test',
  cvSource: null,
  profile: null,
};

beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
});
afterEach(() => {
  jest
    .mocked(Network.getNetworkStateAsync)
    .mockResolvedValue({ isConnected: true, isInternetReachable: true } as never);
  onlineManager.setOnline(true);
});

const open = (id = 'job-1') => startSignedIn(`/apply/${id}`, 'apply.screen');
const setup = (over: { jobs?: unknown[]; me?: unknown; apps?: unknown[] } = {}) => {
  const jobs = installJobsBackend({ jobs: (over.jobs ?? [job]) as never, me: over.me ?? applicantMe });
  const apps = installApplicationsBackend({ apps: (over.apps ?? []) as never });
  return { jobs, apps };
};

describe('Apply chooser: content (website wording)', () => {
  it('shows what you are applying for and the choice sentence', async () => {
    setup();
    await open();
    expect(await screen.findByText('Applying for')).toBeOnTheScreen();
    const card = within(screen.getByTestId('apply.job'));
    expect(card.getByText('Radiology Technician')).toBeOnTheScreen();
    expect(card.getByText('Verified Hospital')).toBeOnTheScreen();
    expect(card.getByText('Seed Valley Care Centre · Bengaluru, Karnataka')).toBeOnTheScreen();
    expect(screen.getByText('Choose one way to apply')).toBeOnTheScreen();
    expect(screen.getByText(/Use the structured form/)).toBeOnTheScreen();
    expect(screen.getByText(/not both for the same application/)).toBeOnTheScreen();
  });

  it('with a saved form CV: Edit & apply, Upload & apply, and the Quick Apply card', async () => {
    setup();
    await open();
    expect(await screen.findByText('Structured form')).toBeOnTheScreen();
    expect(
      screen.getByText('15-step form that builds your professional CV and syncs to recruiters.'),
    ).toBeOnTheScreen();
    expect(within(screen.getByTestId('apply.choice.form')).getByText('Edit & apply')).toBeOnTheScreen();
    expect(screen.queryByTestId('apply.recommended')).not.toBeOnTheScreen();
    expect(screen.getByText('Upload CV')).toBeOnTheScreen();
    expect(
      screen.getByText("Submit a PDF or DOCX only. Your portal form CV won't be used for this application."),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('apply.choice.upload')).toBeEnabled();
    expect(screen.getAllByText('Quick Apply').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('One tap with your saved form CV')).toBeOnTheScreen();
    expect(screen.getByTestId('apply.quick')).toBeEnabled();
  });

  it('without a form CV: Start form is Recommended, CV upload is locked with the reason, Quick Apply is locked', async () => {
    setup({ me: noProfile });
    await open();
    expect(await screen.findByText('Structured form')).toBeOnTheScreen();
    expect(within(screen.getByTestId('apply.choice.form')).getByText('Start form')).toBeOnTheScreen();
    expect(screen.getByTestId('apply.recommended')).toHaveTextContent('Recommended');
    expect(
      screen.getByText('You must complete the structured form once before you can use CV upload.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('apply.choice.upload')).toBeDisabled();
    expect(
      screen.getByText('Quick Apply unlocks after you complete the structured form once.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('apply.quick')).not.toBeOnTheScreen();
  });

  it('a profile below 30 percent counts as no form CV', async () => {
    setup({ me: { ...applicantMe, profile: { ...applicantMe.profile, completeness: 29 } } });
    await open();
    expect(
      await screen.findByText('Quick Apply unlocks after you complete the structured form once.'),
    ).toBeOnTheScreen();
  });

  it('every button has a spoken label', async () => {
    setup();
    await open();
    await screen.findByText('Structured form');
    expect(screen.getByLabelText('Back')).toBeOnTheScreen();
    expect(screen.getByLabelText('Edit & apply')).toBeOnTheScreen();
    expect(screen.getByLabelText('Upload & apply')).toBeOnTheScreen();
    expect(screen.getByLabelText('Quick Apply')).toBeOnTheScreen();
  });
});

describe('Apply chooser: already applied', () => {
  it('says so, with the job, and leads to My Applications', async () => {
    setup({ apps: [{ ...applied, jobId: 'job-1' }] });
    await open();
    expect(await screen.findByText('Already applied')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'You have already submitted an application for Radiology Technician at Seed Valley Care Centre.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Choose one way to apply')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('apply.applied.view'));
    expect(await screen.findByTestId('applications.screen')).toBeOnTheScreen();
  });

  it('when the list of applications cannot be loaded, applying stays possible (the server refuses a double apply)', async () => {
    setup();
    server.use(
      http.get(`${API}/api/applications`, () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
    );
    await open();
    expect(await screen.findByText('Choose one way to apply')).toBeOnTheScreen();
  });
});

describe('Apply chooser: loading, offline, error, not found', () => {
  it('shows a skeleton while the job loads', async () => {
    setup();
    server.use(
      http.get(`${API}/api/jobs/:id`, async () => {
        await delay(300);
        return HttpResponse.json(job);
      }),
    );
    await open();
    expect(screen.getByTestId('apply.loading')).toBeOnTheScreen();
    expect(await screen.findByText('Applying for')).toBeOnTheScreen();
  });

  it('an unknown job says "Job not found" and leads back to the jobs', async () => {
    setup({ jobs: [] });
    await open('missing');
    expect(await screen.findByText('Job not found')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('apply.notfound.browse'));
    expect(await screen.findByTestId('home.screen')).toBeOnTheScreen();
  });

  it('a server error shows Try Again, and Try Again loads the job', async () => {
    setup();
    let calls = 0;
    server.use(
      http.get(`${API}/api/jobs/:id`, () =>
        ++calls === 1 ? HttpResponse.json({ error: 'boom' }, { status: 500 }) : HttpResponse.json(job),
      ),
    );
    await open();
    expect(await screen.findByTestId('apply.error')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Try Again'));
    expect(await screen.findByText('Applying for')).toBeOnTheScreen();
  });

  it('a candidate row that cannot be loaded is an error too, not a wrongly locked screen', async () => {
    setup();
    server.use(
      http.get(`${API}/api/candidates/me`, () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
    );
    await open();
    expect(await screen.findByTestId('apply.error')).toBeOnTheScreen();
    expect(
      screen.queryByText('Quick Apply unlocks after you complete the structured form once.'),
    ).not.toBeOnTheScreen();
  });

  it('offline: a clear message instead of a spinner for ever', async () => {
    jest
      .mocked(Network.getNetworkStateAsync)
      .mockResolvedValue({ isConnected: false, isInternetReachable: false } as never);
    setup();
    await open();
    await act(async () => onlineManager.setOnline(false));
    expect(await screen.findByTestId('apply.offline')).toBeOnTheScreen();
  });
});

describe('Quick Apply', () => {
  it('applies with the saved profile, says "Application submitted!" and goes to My Applications', async () => {
    const { apps } = setup();
    await open();
    await fireEvent.press(await screen.findByTestId('apply.quick'));
    expect(await screen.findByText('Application submitted!')).toBeOnTheScreen();
    expect(await screen.findByTestId('applications.screen')).toBeOnTheScreen();
    expect(apps.bodies[0]).toMatchObject({
      jobId: 'job-1',
      cvSource: 'form',
      profile: { name: 'Demo Applicant', completeness: 94, futureFlag: { keep: 'me' } },
    });
    expect(apps.bodies[0]).not.toHaveProperty('customFieldResponses');
  });

  it('shows "Submitting…" and ignores a second tap while the request runs', async () => {
    const { apps } = setup();
    server.use(
      http.post(`${API}/api/applications`, async ({ request }) => {
        apps.bodies.push(await request.json());
        await delay(300);
        return HttpResponse.json({ ...applied, jobId: 'job-1' }, { status: 201 });
      }),
    );
    await open();
    const button = await screen.findByTestId('apply.quick');
    await fireEvent.press(button);
    await fireEvent.press(button);
    expect(await within(screen.getByTestId('apply.quick')).findByText('Submitting…')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByTestId('applications.screen')).toBeOnTheScreen());
    expect(apps.bodies).toHaveLength(1);
  });

  it('a server refusal shows its reason, stays on the screen and lets the user try again', async () => {
    setup();
    server.use(
      http.post(`${API}/api/applications`, () =>
        HttpResponse.json({ error: 'This job is no longer accepting applications' }, { status: 400 }),
      ),
    );
    await open();
    await fireEvent.press(await screen.findByTestId('apply.quick'));
    expect(await screen.findByText('This job is no longer accepting applications')).toBeOnTheScreen();
    expect(screen.getByTestId('apply.screen')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByTestId('apply.quick')).toBeEnabled());
  });

  it('a server error says "Failed to submit application"', async () => {
    setup();
    server.use(
      http.post(`${API}/api/applications`, () =>
        HttpResponse.json({ error: 'Prisma exploded' }, { status: 500 }),
      ),
    );
    await open();
    await fireEvent.press(await screen.findByTestId('apply.quick'));
    expect(await screen.findByText('Failed to submit application')).toBeOnTheScreen();
    expect(screen.queryByText('Prisma exploded')).not.toBeOnTheScreen();
  });

  it('"already applied" from the server turns the screen into the Already applied page', async () => {
    const { apps } = setup();
    server.use(
      http.post(`${API}/api/applications`, () => {
        apps.apps.unshift({ ...applied, jobId: 'job-1' });
        return HttpResponse.json({ error: 'You have already applied to this job' }, { status: 409 });
      }),
    );
    await open();
    await fireEvent.press(await screen.findByTestId('apply.quick'));
    expect(await screen.findByText('Already applied')).toBeOnTheScreen();
  });
});

describe('Job questions on the chooser', () => {
  it('are shown with the website sentence under them', async () => {
    setup({ jobs: [jobWithQuestions] });
    await open();
    expect(await screen.findByText('Answer these job-specific questions')).toBeOnTheScreen();
    expect(
      screen.getByText('Required for all application methods (form, upload, or quick apply).'),
    ).toBeOnTheScreen();
  });

  it('Quick Apply is refused until the required ones are answered, with the website message and no request', async () => {
    const { apps } = setup({ jobs: [jobWithQuestions] });
    await open();
    await fireEvent.press(await screen.findByTestId('apply.quick'));
    expect(
      await screen.findAllByText('"Which imaging machines have you operated?" is required'),
    ).not.toHaveLength(0);
    expect(apps.calls).not.toContain('POST /api/applications');
    await fireEvent.changeText(screen.getByTestId('apply.questions.q_modality'), '128-slice CT');
    await fireEvent.press(screen.getByTestId('apply.quick'));
    expect(await screen.findAllByText('"Scans you handle per day" is required')).not.toHaveLength(0);
  });

  it('sends the answers: numbers as numbers, yes/no as true or false, empty optional ones left out', async () => {
    const { apps } = setup({ jobs: [jobWithQuestions] });
    await open();
    await fireEvent.changeText(await screen.findByTestId('apply.questions.q_modality'), '128-slice CT');
    await fireEvent.changeText(screen.getByTestId('apply.questions.q_scans'), '12');
    await fireEvent.press(screen.getByTestId('apply.questions.q_shift.option.1'));
    await fireEvent.press(screen.getByTestId('apply.questions.q_license.no'));
    await fireEvent.press(screen.getByTestId('apply.quick'));
    expect(await screen.findByTestId('applications.screen')).toBeOnTheScreen();
    expect(apps.bodies[0]).toMatchObject({
      customFieldResponses: { q_modality: '128-slice CT', q_scans: 12, q_shift: 'Evening', q_license: false },
    });
    expect((apps.bodies[0] as { customFieldResponses: object }).customFieldResponses).not.toHaveProperty(
      'q_notes',
    );
  });
});

describe('Structured form card', () => {
  it('opens the form page, which leads to the profile form and back', async () => {
    setup();
    await open();
    await fireEvent.press(await screen.findByTestId('apply.choice.form'));
    expect(await screen.findByTestId('apply.form.screen')).toBeOnTheScreen();
    expect(screen.getByText('Application form')).toBeOnTheScreen();
    expect(screen.getByText(/Fill in the profile form first/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('apply.form.build'));
    expect(await screen.findByTestId('builder.screen')).toBeOnTheScreen();
  });

  it('the form page leads back to the chooser', async () => {
    setup();
    await open();
    await fireEvent.press(await screen.findByTestId('apply.choice.form'));
    await screen.findByTestId('apply.form.screen');
    await fireEvent.press(screen.getByTestId('apply.form.back'));
    expect(await screen.findByTestId('apply.screen')).toBeOnTheScreen();
  });
});

describe('Entry from the job page and sign-out', () => {
  it('Apply Now on the job page opens the chooser for that job', async () => {
    setup();
    await startSignedIn('/job/job-1', 'job.screen');
    await fireEvent.press(await screen.findByTestId('job.apply'));
    expect(await screen.findByTestId('apply.screen')).toBeOnTheScreen();
    expect(await screen.findByText('Radiology Technician')).toBeOnTheScreen();
  });
});
