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

const nurse = makeJob({
  id: 'n1',
  role: 'Staff Nurse',
  hospital: 'Seed City Hospital',
  category: 'Nurses',
  city: 'Kolkata',
  matchPercent: 82,
});
const doctor = makeJob({
  id: 'd1',
  role: 'Cardiologist',
  hospital: 'Valley Care',
  category: 'Doctors',
  city: 'Bengaluru',
  matchPercent: 64,
  postedDays: 3,
});
const dentist = makeJob({
  id: 't1',
  role: 'Dental Surgeon',
  hospital: 'Smile Clinic',
  category: 'Dentists',
  city: 'Pune',
  matchPercent: 55,
  postedDays: 5,
});

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

const home = () => startSignedIn('/', 'home.screen');

describe('Home: loaded', () => {
  it('shows the website wording and every job card', async () => {
    installJobsBackend({ jobs: [nurse, doctor, dentist] });
    await home();
    expect(await screen.findByTestId('job.card.n1')).toBeOnTheScreen();
    expect(screen.getByTestId('job.card.d1')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'All Opportunities' })).toBeOnTheScreen();
    expect(screen.getByTestId('home.count')).toHaveTextContent('Showing 3 of 3 verified roles');
  });

  it('a card has the website fields: hospital, location, role, specialty, pills, posted, match, View Details', async () => {
    installJobsBackend({ jobs: [nurse] });
    await home();
    const card = await screen.findByTestId('job.card.n1');
    const c = within(card);
    expect(c.getByText('Seed City Hospital')).toBeOnTheScreen();
    expect(c.getByText('Verified')).toBeOnTheScreen();
    expect(c.getByText('Staff Nurse')).toBeOnTheScreen();
    expect(c.getByText('Full-time')).toBeOnTheScreen();
    expect(c.getByText('1–5 yrs')).toBeOnTheScreen();
    expect(c.getByText('₹3–4.5 LPA')).toBeOnTheScreen();
    expect(c.getByText('Today')).toBeOnTheScreen();
    expect(c.getByLabelText('82% match')).toBeOnTheScreen();
    expect(c.getByRole('button', { name: 'View Details, Staff Nurse' })).toBeOnTheScreen();
  });

  it('latest jobs first (postedDays ascending), like the website', async () => {
    installJobsBackend({ jobs: [dentist, doctor, nurse] });
    await home();
    await screen.findByTestId('job.card.n1');
    const ids = screen.getAllByTestId(/^job\.card\./).map((n) => n.props.testID);
    expect(ids).toEqual(['job.card.n1', 'job.card.d1', 'job.card.t1']);
  });

  it('Recommended for you: the best matches first, with their match score', async () => {
    installJobsBackend({ jobs: [dentist, doctor, nurse] });
    await home();
    await screen.findByTestId('recommended.rail');
    expect(screen.getByText('Recommended for you')).toBeOnTheScreen();
    expect(screen.getByText('Matched to your profile')).toBeOnTheScreen();
    const picks = screen.getAllByTestId(/^recommended\.job\./).map((n) => n.props.testID);
    expect(picks).toEqual(['recommended.job.n1', 'recommended.job.d1', 'recommended.job.t1']);
  });

  it('no match scores and no profile: "Unlock personalised recommendations"', async () => {
    installJobsBackend({ jobs: [makeJob({ id: 'x', matchPercent: null })] });
    await home();
    expect(await screen.findByTestId('recommended.prompt')).toBeOnTheScreen();
    expect(screen.getByText('Unlock personalised recommendations')).toBeOnTheScreen();
    expect(
      screen.getByText("Complete your profile and we'll match you to the best roles instantly."),
    ).toBeOnTheScreen();
  });

  it('the prompt has "Build my CV", which opens the profile form', async () => {
    installJobsBackend({ jobs: [makeJob({ id: 'x', matchPercent: null })] });
    await home();
    await fireEvent.press(await screen.findByTestId('recommended.build'));
    expect(await screen.findByTestId('builder.screen')).toBeOnTheScreen();
  });

  it('a profile of 20%+ is scored on the device and only jobs in its location are recommended', async () => {
    installJobsBackend({
      jobs: [nurse, doctor],
      me: {
        id: 'c1',
        cvSource: 'form',
        profile: {
          role: 'Nursing Professionals & Paramedics',
          yearsExperience: 3,
          city: 'Kolkata',
          state: 'West Bengal',
          preferredLocations: [],
          clinicalSkills: [],
          technicalSkills: [],
          completeness: 80,
        },
      },
    });
    await home();
    await screen.findByTestId('recommended.rail');
    const picks = screen.getAllByTestId(/^recommended\.job\./).map((n) => n.props.testID);
    expect(picks).toEqual(['recommended.job.n1']);
  });

  it('categories come from the jobs; choosing one filters the list and the count', async () => {
    installJobsBackend({ jobs: [nurse, doctor, dentist] });
    await home();
    await screen.findByTestId('categories.rail');
    expect(screen.getByTestId('categories.chip.all')).toBeOnTheScreen();
    expect(screen.getByTestId('categories.chip.Doctors')).toBeOnTheScreen();
    expect(screen.getByTestId('categories.chip.Nurses')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('categories.chip.Doctors'));
    expect(screen.getByTestId('home.count')).toHaveTextContent('Showing 1 of 3 verified roles');
    expect(screen.queryByTestId('job.card.n1')).not.toBeOnTheScreen();
    expect(screen.getByTestId('job.card.d1')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('categories.chip.all'));
    expect(screen.getByTestId('home.count')).toHaveTextContent('Showing 3 of 3 verified roles');
  });
});

describe('Home: navigation', () => {
  it('View Details opens the job', async () => {
    installJobsBackend({ jobs: [nurse] });
    const app = await home();
    await fireEvent.press(await screen.findByTestId('job.open.n1'));
    await waitFor(() => expect(app.getPathname()).toBe('/job/n1'));
  });

  it('the title block opens the job too', async () => {
    installJobsBackend({ jobs: [nurse] });
    const app = await home();
    await fireEvent.press(await screen.findByTestId('job.title.n1'));
    await waitFor(() => expect(app.getPathname()).toBe('/job/n1'));
  });

  it('a recommended job opens the job', async () => {
    installJobsBackend({ jobs: [nurse] });
    const app = await home();
    await fireEvent.press(await screen.findByTestId('recommended.job.n1'));
    await waitFor(() => expect(app.getPathname()).toBe('/job/n1'));
  });

  it('the search bar opens Search', async () => {
    installJobsBackend({ jobs: [nurse] });
    const app = await home();
    await fireEvent.press(await screen.findByTestId('home.search'));
    await waitFor(() => expect(app.getPathname()).toBe('/search'));
  });

  it.each([
    ['home.link.saved', 'Saved jobs', '/saved-jobs'],
    ['home.link.gov', 'Govt Jobs', '/gov-jobs'],
    ['home.link.intl', 'International Jobs', '/intl-jobs'],
  ])('%s opens %s', async (testID, name, path) => {
    installJobsBackend({ jobs: [nurse] });
    const app = await home();
    await screen.findByTestId('job.card.n1');
    expect(screen.getByRole('button', { name })).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId(testID));
    await waitFor(() => expect(app.getPathname()).toBe(path));
  });
});

describe('Home: saving', () => {
  it('the bookmark changes at once and the job is saved on the server', async () => {
    const backend = installJobsBackend({ jobs: [nurse] });
    await home();
    await screen.findByTestId('job.card.n1');
    await waitFor(() => expect(backend.calls).toContain('GET /api/saved-jobs'));
    expect(screen.getByLabelText('Save job')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('job.save.n1'));
    expect(await screen.findByLabelText('Remove from saved jobs')).toBeOnTheScreen();
    expect(await screen.findByText('Job saved')).toBeOnTheScreen();
    expect(backend.saved.map((s) => s.job.id)).toEqual(['n1']);
  });

  it('a saved job shows its bookmark filled; tapping removes it', async () => {
    const backend = installJobsBackend({
      jobs: [nurse],
      saved: [{ savedAt: '2026-10-26T09:00:00.000Z', job: nurse }],
    });
    await home();
    expect(await screen.findByLabelText('Remove from saved jobs')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('job.save.n1'));
    expect(await screen.findByLabelText('Save job')).toBeOnTheScreen();
    expect(await screen.findByText('Removed from saved jobs')).toBeOnTheScreen();
    expect(backend.saved).toEqual([]);
  });

  it('a save the server refuses goes back and the error is shown', async () => {
    installJobsBackend({ jobs: [nurse] });
    server.use(
      http.post(`${API}/api/saved-jobs`, () => HttpResponse.json({ error: 'nope' }, { status: 500 })),
    );
    await home();
    await screen.findByTestId('job.card.n1');
    await fireEvent.press(screen.getByTestId('job.save.n1'));
    expect(await screen.findByText('Failed to save job')).toBeOnTheScreen();
    expect(screen.getByLabelText('Save job')).toBeOnTheScreen();
  });
});

describe('Home: states', () => {
  it('loading: skeleton cards, no "no jobs" text', async () => {
    installJobsBackend({ jobs: [nurse] });
    server.use(
      http.get(`${API}/api/jobs`, async () => {
        await delay(200);
        return HttpResponse.json([nurse]);
      }),
    );
    await home();
    expect(screen.getByTestId('home.loading')).toBeOnTheScreen();
    expect(screen.queryByText('No open positions yet')).not.toBeOnTheScreen();
    expect(await screen.findByTestId('job.card.n1')).toBeOnTheScreen();
    expect(screen.queryByTestId('home.loading')).not.toBeOnTheScreen();
  });

  it('empty: the website text', async () => {
    installJobsBackend({ jobs: [] });
    await home();
    expect(await screen.findByText('No open positions yet')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Hospitals post roles from the recruiter portal. Check back soon or widen your search.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('home.count')).toHaveTextContent('Showing 0 of 0 verified roles');
  });

  it('error: "Something went wrong" with Try Again, which loads the list', async () => {
    installJobsBackend({ jobs: [nurse] });
    let fail = true;
    server.use(
      http.get(`${API}/api/jobs`, () =>
        fail ? HttpResponse.json({ error: 'boom' }, { status: 500 }) : HttpResponse.json([nurse]),
      ),
    );
    await home();
    expect(await screen.findByTestId('home.error')).toBeOnTheScreen();
    expect(screen.getByText('Something went wrong')).toBeOnTheScreen();
    expect(screen.getByText('Server error. Please try again in a moment.')).toBeOnTheScreen();
    expect(screen.queryByText('No open positions yet')).not.toBeOnTheScreen();

    fail = false;
    await fireEvent.press(screen.getByTestId('home.error.retry'));
    expect(await screen.findByTestId('job.card.n1')).toBeOnTheScreen();
  });

  it('offline before anything loaded: offline message with Try Again, not a skeleton for ever', async () => {
    installJobsBackend({ jobs: [nurse] });
    // The root layout feeds onlineManager from expo-network, so the phone has to report offline.
    jest
      .mocked(Network.getNetworkStateAsync)
      .mockResolvedValue({ isConnected: false, isInternetReachable: false } as never);
    await home();
    expect(await screen.findByTestId('home.offline')).toBeOnTheScreen();
    expect(screen.getByText("You're offline")).toBeOnTheScreen();
    expect(screen.getByTestId('offline.banner')).toBeOnTheScreen();

    await act(async () => onlineManager.setOnline(true));
    await fireEvent.press(screen.getByTestId('home.offline.retry'));
    expect(await screen.findByTestId('job.card.n1')).toBeOnTheScreen();
  });

  it('offline after loading: the list stays, with the offline banner', async () => {
    installJobsBackend({ jobs: [nurse] });
    await home();
    await screen.findByTestId('job.card.n1');
    await act(async () => onlineManager.setOnline(false));
    expect(screen.getByTestId('job.card.n1')).toBeOnTheScreen();
    expect(screen.getByTestId('offline.banner')).toBeOnTheScreen();
  });

  it('pull to refresh loads the list again', async () => {
    const backend = installJobsBackend({ jobs: [nurse] });
    await home();
    await screen.findByTestId('job.card.n1');
    const before = backend.calls.filter((c) => c === 'GET /api/jobs').length;
    backend.jobs.push(doctor);

    await act(async () => {
      screen.getByTestId('home.list').props.refreshControl.props.onRefresh();
    });
    expect(await screen.findByTestId('job.card.d1')).toBeOnTheScreen();
    expect(backend.calls.filter((c) => c === 'GET /api/jobs').length).toBeGreaterThan(before);
  });
});
