import { onlineManager } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Network from 'expo-network';
import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { delay, http, HttpResponse } from 'msw';

import { API } from '@/test/msw/handlers';
import { installJobsBackend, makeJob } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

const full = makeJob({
  id: 'j1',
  role: 'Staff Nurse',
  hospital: 'Seed City Hospital',
  hospitalVerified: true,
  hospitalAbout: 'A 200 bed multispeciality hospital.',
  specialty: 'Nursing',
  location: 'Kolkata, West Bengal',
  city: 'Kolkata',
  type: 'Full-time',
  category: 'Nurses',
  salaryMin: 3,
  salaryMax: 4.5,
  experienceMin: 1,
  experienceMax: 5,
  postedDays: 3,
  tags: ['GNM', 'B.Sc Nursing'],
  description: '<p>Ward <strong>duty</strong> &amp; rounds</p><ul><li>ICU</li><li>OT</li></ul>',
  responsibilities: ['Patient care', 'Medication rounds'],
  requirements: ['GNM or B.Sc Nursing', '1 year experience'],
  perks: ['Meals', 'Insurance'],
  applicants: 7,
  matchPercent: 82,
});
const similar1 = makeJob({ id: 's1', role: 'ICU Nurse', category: 'Nurses' });
const similar2 = makeJob({ id: 's2', role: 'OT Nurse', category: 'Nurses' });
const other = makeJob({ id: 'o1', role: 'Cardiologist', category: 'Doctors' });

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

const open = (id = 'j1') => startSignedIn(`/job/${id}`, 'job.screen');
const field = (id: string) => within(screen.getByTestId(id));

describe('Job details: content (website wording)', () => {
  it('header: role, Verified Hospital, hospital · specialty, location, type, posted', async () => {
    installJobsBackend({ jobs: [full] });
    await open();
    expect(await screen.findByRole('header', { name: 'Staff Nurse' })).toBeOnTheScreen();
    expect(screen.getByText('Verified Hospital')).toBeOnTheScreen();
    expect(screen.getByText('Seed City Hospital · Nursing')).toBeOnTheScreen();
    const header = field('job.header');
    expect(header.getByText('Kolkata, West Bengal')).toBeOnTheScreen();
    expect(header.getByText('Full-time')).toBeOnTheScreen();
    expect(header.getByText('Posted 3d ago')).toBeOnTheScreen();
  });

  it('posted today', async () => {
    installJobsBackend({ jobs: [{ ...full, postedDays: 0 }] });
    await open();
    expect(await screen.findByText('Posted today')).toBeOnTheScreen();
  });

  it('no "Verified Hospital" for an unverified hospital', async () => {
    installJobsBackend({ jobs: [{ ...full, hospitalVerified: false }] });
    await open();
    await screen.findByText('Seed City Hospital · Nursing');
    expect(screen.queryByText('Verified Hospital')).not.toBeOnTheScreen();
  });

  it('tags, About the role (HTML shown as clean text), Responsibilities, Requirements, Perks & benefits, About hospital', async () => {
    installJobsBackend({ jobs: [full] });
    await open();
    await screen.findByText('GNM');
    expect(screen.getByText('B.Sc Nursing')).toBeOnTheScreen();
    expect(screen.getByText('About the role')).toBeOnTheScreen();
    expect(screen.getByTestId('job.description')).toHaveTextContent('Ward duty & rounds • ICU • OT');
    expect(screen.queryByText(/<strong>/)).not.toBeOnTheScreen();
    expect(screen.getByText('Responsibilities')).toBeOnTheScreen();
    expect(screen.getByText('Patient care')).toBeOnTheScreen();
    expect(screen.getByText('Requirements')).toBeOnTheScreen();
    expect(screen.getByText('1 year experience')).toBeOnTheScreen();
    expect(screen.getByText('Perks & benefits')).toBeOnTheScreen();
    expect(screen.getByText('Insurance')).toBeOnTheScreen();
    expect(screen.getByText('About Seed City Hospital')).toBeOnTheScreen();
    expect(screen.getByText('A 200 bed multispeciality hospital.')).toBeOnTheScreen();
  });

  it('empty sections are left out', async () => {
    installJobsBackend({
      jobs: [
        {
          ...full,
          tags: [],
          description: null,
          responsibilities: [],
          requirements: [],
          perks: [],
          hospitalAbout: null,
        },
      ],
    });
    await open();
    await screen.findByRole('header', { name: 'Staff Nurse' });
    for (const t of [
      'About the role',
      'Responsibilities',
      'Requirements',
      'Perks & benefits',
      'About Seed City Hospital',
    ]) {
      expect(screen.queryByText(t)).not.toBeOnTheScreen();
    }
  });

  it('a plain-text description is shown as is', async () => {
    installJobsBackend({ jobs: [{ ...full, description: 'Plain text duties.' }] });
    await open();
    expect(await screen.findByText('Plain text duties.')).toBeOnTheScreen();
  });

  it('Compensation card: salary, experience, job type, location, posted', async () => {
    installJobsBackend({ jobs: [full] });
    await open();
    await screen.findByText('Compensation');
    expect(screen.getByTestId('job.salary')).toHaveTextContent('₹3–4.5 LPA');
    const stats = field('job.stats');
    expect(stats.getByText('Experience')).toBeOnTheScreen();
    expect(stats.getByText('1–5 yrs')).toBeOnTheScreen();
    expect(stats.getByText('Job type')).toBeOnTheScreen();
    expect(stats.getByText('Full-time')).toBeOnTheScreen();
    expect(stats.getByText('Location')).toBeOnTheScreen();
    expect(stats.getByText('Kolkata')).toBeOnTheScreen();
    expect(stats.getByText('Posted')).toBeOnTheScreen();
    expect(stats.getByText('3d ago')).toBeOnTheScreen();
    expect(screen.getByText('Salary disclosed by hospital · Verified')).toBeOnTheScreen();
  });

  it('experience falls back to the free text, then a dash', async () => {
    installJobsBackend({
      jobs: [
        { ...full, experienceMin: 0, experienceMax: 0, experience: '2+ years in ICU' },
        makeJob({ id: 'j2', experienceMin: 0, experienceMax: 0, experience: null, city: null }),
      ],
    });
    await open();
    expect(await field('job.stats').findByText('2+ years in ICU')).toBeOnTheScreen();
  });

  it('applicants: hidden at 0, singular, plural', async () => {
    installJobsBackend({ jobs: [{ ...full, applicants: 1 }] });
    await open();
    expect(await screen.findByText('🧑‍⚕️ 1 person has already applied')).toBeOnTheScreen();
  });

  it('applicants plural', async () => {
    installJobsBackend({ jobs: [full] });
    await open();
    expect(await screen.findByText('🧑‍⚕️ 7 people have already applied')).toBeOnTheScreen();
  });

  it('no applicants line when nobody applied', async () => {
    installJobsBackend({ jobs: [{ ...full, applicants: 0 }] });
    await open();
    await screen.findByText('Compensation');
    expect(screen.queryByText(/already applied/)).not.toBeOnTheScreen();
  });

  it('Match insights with the score, or the prompt to complete the profile', async () => {
    installJobsBackend({ jobs: [full] });
    await open();
    expect(await screen.findByText("Your profile matches 82% of this role's criteria.")).toBeOnTheScreen();
  });

  it('Match insights without a score', async () => {
    installJobsBackend({ jobs: [{ ...full, matchPercent: null }] });
    await open();
    expect(await screen.findByText('Complete your profile for a personalized match.')).toBeOnTheScreen();
  });
});

describe('Job details: Apply Now and Save', () => {
  it('Apply Now is there and tells the candidate it is coming (the apply flow is Phase 3)', async () => {
    installJobsBackend({ jobs: [full] });
    await open();
    await fireEvent.press(await screen.findByTestId('job.apply'));
    expect(await screen.findByText('Applying from the app arrives in the next update.')).toBeOnTheScreen();
  });

  it('a closed job shows a disabled "Position closed"', async () => {
    installJobsBackend({ jobs: [{ ...full, status: 'Closed' }] });
    await open();
    const button = await screen.findByTestId('job.apply');
    expect(within(button).getByText('Position closed')).toBeOnTheScreen();
    expect(button).toBeDisabled();
    expect(screen.queryByText('Apply Now')).not.toBeOnTheScreen();
  });

  it('Save job: the button turns to Saved at once and the job is saved', async () => {
    const backend = installJobsBackend({ jobs: [full] });
    await open();
    await screen.findByText('Compensation');
    await waitFor(() => expect(backend.calls).toContain('GET /api/saved-jobs'));
    await fireEvent.press(screen.getByTestId('job.savebutton'));
    expect(await screen.findByText('Saved')).toBeOnTheScreen();
    expect(await screen.findByText('Job saved')).toBeOnTheScreen();
    expect(backend.saved.map((s) => s.job.id)).toEqual(['j1']);

    await fireEvent.press(screen.getByTestId('job.savebutton'));
    expect(await screen.findByText('Save job')).toBeOnTheScreen();
    expect(await screen.findByText('Removed from saved jobs')).toBeOnTheScreen();
  });

  it('a save the server refuses goes back, with the website text', async () => {
    installJobsBackend({ jobs: [full] });
    server.use(http.post(`${API}/api/saved-jobs`, () => HttpResponse.json({ error: 'x' }, { status: 500 })));
    await open();
    await screen.findByText('Compensation');
    await fireEvent.press(screen.getByTestId('job.savebutton'));
    expect(await screen.findByText('Failed to save job')).toBeOnTheScreen();
    expect(screen.getByText('Save job')).toBeOnTheScreen();
  });
});

describe('Job details: similar opportunities', () => {
  it('asks for the same category without this job, and lists up to 4', async () => {
    const backend = installJobsBackend({ jobs: [full, similar1, similar2, other] });
    await open();
    expect(await screen.findByText('Similar opportunities')).toBeOnTheScreen();
    expect(await screen.findByTestId('job.card.s1')).toBeOnTheScreen();
    expect(screen.getByTestId('job.card.s2')).toBeOnTheScreen();
    expect(screen.queryByTestId('job.card.o1')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('job.card.j1')).not.toBeOnTheScreen();
    expect(backend.calls).toContain('GET /api/jobs?category=Nurses&excludeId=j1&limit=4');
  });

  it('at most 4', async () => {
    const many = Array.from({ length: 6 }, (_, i) => makeJob({ id: `m${i}`, category: 'Nurses' }));
    installJobsBackend({ jobs: [full, ...many] });
    await open();
    await screen.findByTestId('job.card.m0');
    expect(screen.getAllByTestId(/^job\.card\./)).toHaveLength(4);
  });

  it('no section when there is nothing similar, or the job has no category', async () => {
    const backend = installJobsBackend({ jobs: [{ ...full, category: null }, similar1] });
    await open();
    await screen.findByText('Compensation');
    expect(screen.queryByText('Similar opportunities')).not.toBeOnTheScreen();
    expect(backend.calls.filter((c) => c.includes('category='))).toEqual([]);
  });

  it('opens a similar job', async () => {
    installJobsBackend({ jobs: [full, similar1] });
    const app = await open();
    await fireEvent.press(await screen.findByTestId('job.open.s1'));
    await waitFor(() => expect(app.getPathname()).toBe('/job/s1'));
  });

  it('a failure to load similar jobs does not hide the job', async () => {
    installJobsBackend({ jobs: [full] });
    server.use(http.get(`${API}/api/jobs`, () => HttpResponse.json({ error: 'x' }, { status: 500 })));
    await open();
    expect(await screen.findByRole('header', { name: 'Staff Nurse' })).toBeOnTheScreen();
    expect(screen.queryByText('Similar opportunities')).not.toBeOnTheScreen();
  });
});

describe('Job details: states', () => {
  it('loading: skeleton', async () => {
    installJobsBackend({ jobs: [full] });
    server.use(
      http.get(`${API}/api/jobs/:id`, async () => {
        await delay(200);
        return HttpResponse.json(full);
      }),
    );
    await open();
    expect(screen.getByTestId('job.loading')).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'Staff Nurse' })).toBeOnTheScreen();
    expect(screen.queryByTestId('job.loading')).not.toBeOnTheScreen();
  });

  it('404: "Job not found" and "Browse opportunities" goes to Home', async () => {
    installJobsBackend({ jobs: [] });
    const app = await open('missing');
    expect(await screen.findByText('Job not found')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Browse opportunities' }));
    await waitFor(() => expect(app.getPathname()).toBe('/'));
  });

  it('server error: Try Again', async () => {
    installJobsBackend({ jobs: [full] });
    let fail = true;
    server.use(
      http.get(`${API}/api/jobs/:id`, () =>
        fail ? HttpResponse.json({ error: 'x' }, { status: 500 }) : HttpResponse.json(full),
      ),
    );
    await open();
    expect(await screen.findByTestId('job.error')).toBeOnTheScreen();
    expect(screen.getByText('Something went wrong')).toBeOnTheScreen();
    fail = false;
    await fireEvent.press(screen.getByTestId('job.error.retry'));
    expect(await screen.findByRole('header', { name: 'Staff Nurse' })).toBeOnTheScreen();
  });

  it('offline before loading: offline message with Try Again', async () => {
    installJobsBackend({ jobs: [full] });
    jest
      .mocked(Network.getNetworkStateAsync)
      .mockResolvedValue({ isConnected: false, isInternetReachable: false } as never);
    await open();
    expect(await screen.findByTestId('job.offline')).toBeOnTheScreen();
    await act(async () => onlineManager.setOnline(true));
    await fireEvent.press(screen.getByTestId('job.offline.retry'));
    expect(await screen.findByRole('header', { name: 'Staff Nurse' })).toBeOnTheScreen();
  });
});

describe('Job details: navigation', () => {
  it('Back goes to the previous screen', async () => {
    installJobsBackend({ jobs: [full] });
    const app = await startSignedIn('/', 'home.screen');
    await fireEvent.press(await screen.findByTestId('job.open.j1'));
    await screen.findByTestId('job.screen');
    await fireEvent.press(screen.getByRole('button', { name: 'Back to opportunities' }));
    await waitFor(() => expect(app.getPathname()).toBe('/'));
  });

  it('Back on a deep link (nothing to go back to) goes Home', async () => {
    installJobsBackend({ jobs: [full] });
    const app = await open();
    await fireEvent.press(await screen.findByRole('button', { name: 'Back to opportunities' }));
    await waitFor(() => expect(app.getPathname()).toBe('/'));
  });
});

describe('Job details: signed out', () => {
  it('a link to a job while signed out goes to login', async () => {
    const { renderRouter } = jest.requireActual('expo-router/testing-library');
    const { appRoutes } = jest.requireActual('@/test/appRoutes');
    await renderRouter(appRoutes, { initialUrl: '/job/j1' });
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
  });
});
