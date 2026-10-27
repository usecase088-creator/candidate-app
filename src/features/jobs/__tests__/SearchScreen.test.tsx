import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

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
  specialty: 'Nursing',
  category: 'Nurses',
  city: 'Kolkata',
  location: 'Kolkata, West Bengal',
  type: 'Full-time',
  salaryMax: 4.5,
  experienceMin: 1,
  experienceMax: 5,
  postedDays: 2,
  matchPercent: 60,
});
const doctor = makeJob({
  id: 'd1',
  role: 'Cardiologist',
  specialty: 'Cardiology',
  category: 'Doctors',
  city: 'Bengaluru',
  location: 'Bengaluru, Karnataka',
  type: 'Locum',
  salaryMax: 40,
  experienceMin: 8,
  experienceMax: 15,
  postedDays: 0,
  matchPercent: 90,
});
const tech = makeJob({
  id: 't1',
  role: 'Lab Technician',
  specialty: 'Pathology',
  category: 'Technicians',
  city: 'Pune',
  location: 'Pune, Maharashtra',
  type: 'Part-time',
  salaryMax: 3,
  experienceMin: 0,
  experienceMax: 2,
  postedDays: 9,
  matchPercent: 52,
});

beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
});

const search = () => startSignedIn('/search', 'search.screen');
const ids = () => screen.queryAllByTestId(/^job\.card\./).map((n) => n.props.testID.replace('job.card.', ''));
const count = () => screen.getByTestId('search.count');

async function openFilters() {
  await fireEvent.press(screen.getByTestId('search.filters'));
  await screen.findByTestId('filters.sheet');
}

describe('Search: text and city (website: lower-case includes, live)', () => {
  it('shows every job, newest first, with the website count text', async () => {
    installJobsBackend({ jobs: [nurse, doctor, tech] });
    await search();
    await screen.findByTestId('job.card.n1');
    expect(ids()).toEqual(['d1', 'n1', 't1']);
    expect(count()).toHaveTextContent('Showing 3 of 3 verified roles');
  });

  it('the two fields use the website placeholders', async () => {
    installJobsBackend({ jobs: [nurse] });
    await search();
    expect(screen.getByTestId('search.query').props.placeholder).toBe('Role or specialty');
    expect(screen.getByTestId('search.city').props.placeholder).toBe('City or state');
  });

  it('typing filters the list as you type', async () => {
    installJobsBackend({ jobs: [nurse, doctor, tech] });
    await search();
    await screen.findByTestId('job.card.n1');
    await fireEvent.changeText(screen.getByTestId('search.query'), 'CARDIO');
    expect(ids()).toEqual(['d1']);
    expect(count()).toHaveTextContent('Showing 1 of 3 verified roles');
  });

  it('the city field matches city and location', async () => {
    installJobsBackend({ jobs: [nurse, doctor, tech] });
    await search();
    await screen.findByTestId('job.card.n1');
    await fireEvent.changeText(screen.getByTestId('search.city'), 'karnataka');
    expect(ids()).toEqual(['d1']);
  });

  it('no matches: the website text', async () => {
    installJobsBackend({ jobs: [nurse] });
    await search();
    await screen.findByTestId('job.card.n1');
    await fireEvent.changeText(screen.getByTestId('search.query'), 'zzz');
    expect(await screen.findByText('No matches')).toBeOnTheScreen();
    expect(screen.getByText('Try clearing filters or searching for a different role.')).toBeOnTheScreen();
    expect(count()).toHaveTextContent('Showing 0 of 1 verified roles');
  });

  it('what was typed is still there after visiting Home and coming back', async () => {
    installJobsBackend({ jobs: [nurse, doctor] });
    await search();
    await screen.findByTestId('job.card.n1');
    await fireEvent.changeText(screen.getByTestId('search.query'), 'cardio');
    await act(async () => router.navigate('/'));
    await screen.findByTestId('home.screen');
    await act(async () => router.navigate('/search'));
    await screen.findByTestId('search.screen');
    expect(screen.getByTestId('search.query').props.value).toBe('cardio');
    await waitFor(() => expect(ids()).toEqual(['d1']));
  });
});

describe('Search: filter sheet', () => {
  it('opens with the website wording and the cities of the loaded jobs', async () => {
    installJobsBackend({ jobs: [nurse, doctor, tech] });
    await search();
    await screen.findByTestId('job.card.n1');
    await openFilters();
    expect(screen.getByText('Premium filters')).toBeOnTheScreen();
    expect(screen.getByText('No filters applied')).toBeOnTheScreen();
    expect(screen.getByText('3 cities available')).toBeOnTheScreen();
    for (const c of ['Bengaluru', 'Kolkata', 'Pune']) {
      expect(screen.getByTestId(`filters.city.${c}`)).toBeOnTheScreen();
    }
    for (const t of ['Full-time', 'Locum', 'Part-time', 'Contract']) {
      expect(screen.getByTestId(`filters.type.${t}`)).toBeOnTheScreen();
    }
    expect(screen.getByText('Latest roles')).toBeOnTheScreen();
    expect(screen.getByText('Salary high to low')).toBeOnTheScreen();
    expect(screen.getByText('Profile relevance')).toBeOnTheScreen();
  });

  it('a city filter applies at once; the Done button shows how many roles match', async () => {
    installJobsBackend({ jobs: [nurse, doctor, tech] });
    await search();
    await screen.findByTestId('job.card.n1');
    await openFilters();
    await fireEvent.press(screen.getByTestId('filters.city.Kolkata'));
    expect(screen.getByText('1 applied')).toBeOnTheScreen();
    expect(screen.getByText('Show 1 role')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('filters.done'));
    expect(ids()).toEqual(['n1']);
  });

  it('job type, experience and salary', async () => {
    installJobsBackend({ jobs: [nurse, doctor, tech] });
    await search();
    await screen.findByTestId('job.card.n1');
    await openFilters();

    await fireEvent.press(screen.getByTestId('filters.type.Locum'));
    await fireEvent.press(screen.getByTestId('filters.type.Part-time'));
    expect(screen.getByText('Show 2 roles')).toBeOnTheScreen();

    // experience: + moves 1 year at a time
    for (let i = 0; i < 6; i++) await fireEvent.press(screen.getByTestId('filters.exp.plus'));
    expect(screen.getByTestId('filters.exp.value')).toHaveTextContent('6 yrs');
    expect(screen.getByText('6+ years minimum')).toBeOnTheScreen();
    expect(screen.getByText('Show 1 role')).toBeOnTheScreen();

    // salary: + moves 2 LPA at a time, shown as the website does
    await fireEvent.press(screen.getByTestId('filters.salary.plus'));
    expect(screen.getByTestId('filters.salary.value')).toHaveTextContent('₹2+ LPA');
    expect(screen.getByText('₹2+ LPA minimum')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('filters.done'));
    expect(ids()).toEqual(['d1']);
  });

  it('the steppers stop at the website ranges: 0-15 years and 0-50 LPA', async () => {
    installJobsBackend({ jobs: [nurse] });
    await search();
    await screen.findByTestId('job.card.n1');
    await openFilters();
    expect(screen.getByTestId('filters.exp.minus')).toBeDisabled();
    expect(screen.getByTestId('filters.salary.minus')).toBeDisabled();
    for (let i = 0; i < 20; i++) await fireEvent.press(screen.getByTestId('filters.exp.plus'));
    expect(screen.getByTestId('filters.exp.value')).toHaveTextContent('15+ yrs');
    expect(screen.getByTestId('filters.exp.plus')).toBeDisabled();
    for (let i = 0; i < 30; i++) await fireEvent.press(screen.getByTestId('filters.salary.plus'));
    expect(screen.getByTestId('filters.salary.value')).toHaveTextContent('₹50+ LPA');
    expect(screen.getByTestId('filters.salary.plus')).toBeDisabled();
  }, 20_000); // about 40 button presses: close to the 5 s default when the laptop is busy

  it('sort by salary and by profile relevance', async () => {
    installJobsBackend({ jobs: [nurse, doctor, tech] });
    await search();
    await screen.findByTestId('job.card.n1');
    await openFilters();
    await fireEvent.press(screen.getByTestId('filters.sort.salary'));
    await fireEvent.press(screen.getByTestId('filters.done'));
    expect(ids()).toEqual(['d1', 'n1', 't1']);

    await openFilters();
    await fireEvent.press(screen.getByTestId('filters.sort.relevance'));
    await fireEvent.press(screen.getByTestId('filters.done'));
    expect(ids()).toEqual(['d1', 'n1', 't1']);
  });

  it('the Filters button shows how many are active', async () => {
    installJobsBackend({ jobs: [nurse, doctor, tech] });
    await search();
    await screen.findByTestId('job.card.n1');
    expect(screen.getByTestId('search.filters')).toHaveAccessibleName('Filters');
    await openFilters();
    await fireEvent.press(screen.getByTestId('filters.type.Locum'));
    await fireEvent.press(screen.getByTestId('filters.sort.salary'));
    await fireEvent.press(screen.getByTestId('filters.done'));
    expect(screen.getByTestId('search.filters')).toHaveAccessibleName('Filters, 2 active');
  });

  it('Reset filters clears filters and sort but keeps the typed text', async () => {
    installJobsBackend({ jobs: [nurse, doctor, tech] });
    await search();
    await screen.findByTestId('job.card.n1');
    await fireEvent.changeText(screen.getByTestId('search.query'), 'a');
    await openFilters();
    await fireEvent.press(screen.getByTestId('filters.type.Locum'));
    expect(screen.getByText('1 applied')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('filters.reset'));
    expect(screen.getByText('No filters applied')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('filters.close'));
    expect(screen.getByTestId('search.query').props.value).toBe('a');
  });

  it('filters stay when switching tabs', async () => {
    installJobsBackend({ jobs: [nurse, doctor, tech] });
    await search();
    await screen.findByTestId('job.card.n1');
    await openFilters();
    await fireEvent.press(screen.getByTestId('filters.type.Locum'));
    await fireEvent.press(screen.getByTestId('filters.done'));
    await act(async () => router.navigate('/profile'));
    await screen.findByTestId('profile.screen');
    await act(async () => router.navigate('/search'));
    await screen.findByTestId('search.screen');
    await waitFor(() => expect(ids()).toEqual(['d1']));
    expect(screen.getByTestId('search.filters')).toHaveAccessibleName('Filters, 1 active');
  });
});

describe('Search: category from Home', () => {
  it('a chosen category shows as a chip and filters; tapping it clears', async () => {
    installJobsBackend({ jobs: [nurse, doctor, tech] });
    await search();
    await screen.findByTestId('job.card.n1');
    await act(async () => {
      const { useFilterStore } = jest.requireActual('@/features/jobs/filterStore');
      useFilterStore.getState().setCategory('Doctors');
    });
    expect(ids()).toEqual(['d1']);
    const chip = screen.getByTestId('search.category');
    expect(within(chip).getByText('Doctors')).toBeOnTheScreen();
    expect(chip).toHaveAccessibleName('Doctors, tap to remove');
    await fireEvent.press(chip);
    expect(screen.queryByTestId('search.category')).not.toBeOnTheScreen();
    expect(ids()).toEqual(['d1', 'n1', 't1']);
  });
});

describe('Search: opening and saving', () => {
  it('opens a job', async () => {
    installJobsBackend({ jobs: [nurse] });
    const app = await search();
    await fireEvent.press(await screen.findByTestId('job.open.n1'));
    await waitFor(() => expect(app.getPathname()).toBe('/job/n1'));
  });

  it('saves a job from the results', async () => {
    const backend = installJobsBackend({ jobs: [nurse] });
    await search();
    await screen.findByTestId('job.card.n1');
    await fireEvent.press(screen.getByTestId('job.save.n1'));
    expect(await screen.findByText('Job saved')).toBeOnTheScreen();
    expect(backend.saved).toHaveLength(1);
  });
});

describe('Search: states', () => {
  it('loading: skeletons', async () => {
    installJobsBackend({ jobs: [nurse] });
    server.use(
      http.get(`${API}/api/jobs`, async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json([nurse]);
      }),
    );
    await search();
    expect(screen.getByTestId('search.loading')).toBeOnTheScreen();
    expect(await screen.findByTestId('job.card.n1')).toBeOnTheScreen();
  });

  it('error: Try Again', async () => {
    installJobsBackend({ jobs: [nurse] });
    let fail = true;
    server.use(
      http.get(`${API}/api/jobs`, () =>
        fail ? HttpResponse.json({ error: 'x' }, { status: 500 }) : HttpResponse.json([nurse]),
      ),
    );
    await search();
    expect(await screen.findByTestId('search.error')).toBeOnTheScreen();
    fail = false;
    await fireEvent.press(screen.getByTestId('search.error.retry'));
    expect(await screen.findByTestId('job.card.n1')).toBeOnTheScreen();
  });

  it('no jobs at all: "No open positions yet"', async () => {
    installJobsBackend({ jobs: [] });
    await search();
    expect(await screen.findByText('No open positions yet')).toBeOnTheScreen();
  });

  it('the text fields stay usable while the list loads', async () => {
    installJobsBackend({ jobs: [nurse] });
    await search();
    expect(screen.getByTestId('search.query')).toBeOnTheScreen();
    expect(screen.getByTestId('search.city')).toBeOnTheScreen();
  });
});
