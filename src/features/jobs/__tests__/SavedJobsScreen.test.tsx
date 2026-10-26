import { onlineManager } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Network from 'expo-network';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { delay, http, HttpResponse } from 'msw';

import { appRoutes } from '@/test/appRoutes';
import { API } from '@/test/msw/handlers';
import { installJobsBackend, makeJob } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

const a = makeJob({ id: 'a', role: 'Staff Nurse' });
const b = makeJob({ id: 'b', role: 'Cardiologist' });
const saved = (...jobs: (typeof a)[]) => jobs.map((job) => ({ savedAt: '2026-10-26T09:00:00.000Z', job }));

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

const open = () => startSignedIn('/saved-jobs', 'saved.screen');
const ids = () => screen.queryAllByTestId(/^job\.card\./).map((n) => n.props.testID.replace('job.card.', ''));

describe('Saved jobs', () => {
  it('title, count and the saved jobs in the order the server sends (newest first)', async () => {
    installJobsBackend({ jobs: [a, b], saved: saved(b, a) });
    await open();
    expect(await screen.findByRole('header', { name: 'Saved jobs' })).toBeOnTheScreen();
    await screen.findByTestId('job.card.a');
    expect(screen.getByTestId('saved.count')).toHaveTextContent('2 roles bookmarked for later');
    expect(ids()).toEqual(['b', 'a']);
  });

  it('count is singular for one job', async () => {
    installJobsBackend({ jobs: [a], saved: saved(a) });
    await open();
    expect(await screen.findByText('1 role bookmarked for later')).toBeOnTheScreen();
  });

  it('every saved job shows its bookmark as saved', async () => {
    installJobsBackend({ jobs: [a], saved: saved(a) });
    await open();
    expect(await screen.findByLabelText('Remove from saved jobs')).toBeOnTheScreen();
  });

  it('"Browse opportunities →" goes Home', async () => {
    installJobsBackend({ jobs: [a], saved: saved(a) });
    const app = await open();
    await fireEvent.press(await screen.findByRole('button', { name: 'Browse opportunities' }));
    await waitFor(() => expect(app.getPathname()).toBe('/'));
  });

  it('opens a job', async () => {
    installJobsBackend({ jobs: [a], saved: saved(a) });
    const app = await open();
    await fireEvent.press(await screen.findByTestId('job.open.a'));
    await waitFor(() => expect(app.getPathname()).toBe('/job/a'));
  });

  it('Back goes to the previous screen, or Home on a deep link', async () => {
    installJobsBackend({ jobs: [a], saved: saved(a) });
    const app = await open();
    await fireEvent.press(await screen.findByRole('button', { name: 'Back' }));
    await waitFor(() => expect(app.getPathname()).toBe('/'));
  });
});

describe('Saved jobs: removing', () => {
  it('unsaving takes the card off the list at once and tells the server', async () => {
    const backend = installJobsBackend({ jobs: [a, b], saved: saved(b, a) });
    await open();
    await screen.findByTestId('job.card.a');
    await fireEvent.press(screen.getByTestId('job.save.a'));
    await waitFor(() => expect(screen.queryByTestId('job.card.a')).not.toBeOnTheScreen());
    expect(await screen.findByText('Removed from saved jobs')).toBeOnTheScreen();
    expect(screen.getByTestId('saved.count')).toHaveTextContent('1 role bookmarked for later');
    expect(backend.saved.map((s) => s.job.id)).toEqual(['b']);
  });

  it('removing the last one shows the empty state', async () => {
    installJobsBackend({ jobs: [a], saved: saved(a) });
    await open();
    await fireEvent.press(await screen.findByTestId('job.save.a'));
    expect(await screen.findByText('No saved jobs yet')).toBeOnTheScreen();
  });

  it('a removal the server refuses brings the card back, with the website text', async () => {
    installJobsBackend({ jobs: [a], saved: saved(a) });
    server.use(
      http.delete(`${API}/api/saved-jobs/a`, () => HttpResponse.json({ error: 'x' }, { status: 500 })),
    );
    await open();
    await fireEvent.press(await screen.findByTestId('job.save.a'));
    expect(await screen.findByText('Failed to remove saved job')).toBeOnTheScreen();
    expect(await screen.findByTestId('job.card.a')).toBeOnTheScreen();
  });
});

describe('Saved jobs: states', () => {
  it('empty: the website text and "Find opportunities"', async () => {
    installJobsBackend({ jobs: [a], saved: [] });
    const app = await open();
    expect(await screen.findByText('No saved jobs yet')).toBeOnTheScreen();
    expect(screen.getByText('Tap the bookmark icon on any job to save it here.')).toBeOnTheScreen();
    expect(screen.getByTestId('saved.count')).toHaveTextContent('0 roles bookmarked for later');
    await fireEvent.press(screen.getByRole('button', { name: 'Find opportunities' }));
    await waitFor(() => expect(app.getPathname()).toBe('/'));
  });

  it('loading: skeletons, not the empty text', async () => {
    installJobsBackend({ jobs: [a], saved: saved(a) });
    server.use(
      http.get(`${API}/api/saved-jobs`, async () => {
        await delay(200);
        return HttpResponse.json(saved(a));
      }),
    );
    await open();
    expect(screen.getByTestId('saved.loading')).toBeOnTheScreen();
    expect(screen.queryByText('No saved jobs yet')).not.toBeOnTheScreen();
    expect(await screen.findByTestId('job.card.a')).toBeOnTheScreen();
  });

  it('error: Try Again (the website would show the empty state)', async () => {
    installJobsBackend({ jobs: [a], saved: saved(a) });
    let fail = true;
    server.use(
      http.get(`${API}/api/saved-jobs`, () =>
        fail ? HttpResponse.json({ error: 'x' }, { status: 500 }) : HttpResponse.json(saved(a)),
      ),
    );
    await open();
    expect(await screen.findByTestId('saved.error')).toBeOnTheScreen();
    expect(screen.queryByText('No saved jobs yet')).not.toBeOnTheScreen();
    fail = false;
    await fireEvent.press(screen.getByTestId('saved.error.retry'));
    expect(await screen.findByTestId('job.card.a')).toBeOnTheScreen();
  });

  it('offline before loading: offline message with Try Again', async () => {
    installJobsBackend({ jobs: [a], saved: saved(a) });
    jest
      .mocked(Network.getNetworkStateAsync)
      .mockResolvedValue({ isConnected: false, isInternetReachable: false } as never);
    await open();
    expect(await screen.findByTestId('saved.offline')).toBeOnTheScreen();
    await act(async () => onlineManager.setOnline(true));
    await fireEvent.press(screen.getByTestId('saved.offline.retry'));
    expect(await screen.findByTestId('job.card.a')).toBeOnTheScreen();
  });

  it('pull to refresh loads the list again', async () => {
    const backend = installJobsBackend({ jobs: [a, b], saved: saved(a) });
    await open();
    await screen.findByTestId('job.card.a');
    backend.saved.unshift(...saved(b));
    await act(async () => {
      screen.getByTestId('saved.list').props.refreshControl.props.onRefresh();
    });
    expect(await screen.findByTestId('job.card.b')).toBeOnTheScreen();
  });

  it('signed out: a link to Saved jobs goes to login', async () => {
    await renderRouter(appRoutes, { initialUrl: '/saved-jobs' });
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
  });
});
