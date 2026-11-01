// Guest browsing (App Store 5.1.1 (v), website parity): a signed-out visitor opens the app on Home, sees the job feed and
// job details, and is asked to sign in only for what needs an account. After signing in they land where they were heading.
import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { useSession } from '@/features/auth/sessionStore';
import { appRoutes } from '@/test/appRoutes';
import { loginResponse, meResponse } from '@/test/fixtures/auth';
import { API } from '@/test/msw/handlers';
import { installJobsBackend, makeJob } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { resetAppState } from '@/test/startSignedIn';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

const JOBS = [makeJob({ id: 'j1', role: 'Staff Nurse' }), makeJob({ id: 'j2', role: 'ICU Technician' })];

/** Paths asked of the server that need an account: a guest must never ask for them. */
const ACCOUNT_ONLY = ['/api/saved-jobs', '/api/candidate/me', '/api/notifications', '/api/applications'];
let seen: string[];

beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
  seen = [];
  installJobsBackend({ jobs: JOBS });
  server.use(
    http.all(`${API}/api/*`, ({ request }) => {
      seen.push(new URL(request.url).pathname);
      return undefined;
    }),
    http.post(`${API}/api/auth/login`, () => HttpResponse.json(loginResponse)),
    http.get(`${API}/api/auth/me`, () => HttpResponse.json(meResponse)),
    http.get(`${API}/api/applications`, () => HttpResponse.json([])),
  );
});

async function openApp(url = '/') {
  const app = await renderRouter(appRoutes, { initialUrl: url });
  await screen.findByTestId('topbar');
  return app;
}

async function signInNow() {
  await fireEvent.changeText(await screen.findByTestId('login.email'), 'candidate@apronhanger.test');
  await fireEvent.changeText(screen.getByTestId('login.password'), 'Secret#123');
  await fireEvent.press(screen.getByTestId('login.submit'));
  await waitFor(() => expect(useSession.getState().status).toBe('signedIn'), { timeout: 4000 });
}

describe('opening the app signed out', () => {
  it('shows Home with the job feed, not the login screen', async () => {
    await openApp();
    expect(await screen.findByTestId('job.card.j1')).toBeOnTheScreen();
    expect(screen.getByTestId('job.card.j2')).toBeOnTheScreen();
    expect(screen.queryByTestId('login.screen')).toBeNull();
  });

  it('offers Sign in in the top bar instead of the bell', async () => {
    await openApp();
    expect(screen.getByTestId('topbar.signin')).toBeOnTheScreen();
    expect(screen.queryByTestId('topbar.notifications')).toBeNull();
  });

  it('does not show the recommended rail or ask for anything that needs an account', async () => {
    await openApp();
    await screen.findByTestId('job.card.j1');
    expect(screen.queryByTestId('recommended.prompt')).toBeNull();
    expect(screen.queryByTestId('recommended.rail')).toBeNull();
    expect(seen.filter((p) => ACCOUNT_ONLY.some((a) => p.startsWith(a)))).toEqual([]);
  });

  it('a job opens with its details', async () => {
    const app = await openApp();
    await fireEvent.press(await screen.findByTestId('job.open.j1'));
    expect(await screen.findByTestId('job.screen')).toBeOnTheScreen();
    expect(await screen.findByTestId('job.header')).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/job/j1');
    expect(seen.filter((p) => ACCOUNT_ONLY.some((a) => p.startsWith(a)))).toEqual([]);
  });

  it('a link to a job works signed out', async () => {
    await renderRouter(appRoutes, { initialUrl: '/job/j1' });
    expect(await screen.findByTestId('job.header')).toBeOnTheScreen();
    expect(screen.queryByTestId('login.screen')).toBeNull();
  });
});

describe('what needs an account', () => {
  it('Applications and Profile tabs ask the visitor to sign in', async () => {
    await openApp();
    await fireEvent.press(screen.getByTestId('tabs.applications'));
    expect(await screen.findByTestId('applications.signin')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('tabs.profile'));
    expect(await screen.findByTestId('profile.signin')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('profile.signin.button'));
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
  });

  it('Sign in in the top bar opens login, and signing in returns to Home', async () => {
    const app = await openApp();
    await fireEvent.press(screen.getByTestId('topbar.signin'));
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
    await signInNow();
    expect(await screen.findByTestId('home.screen')).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/');
    expect(screen.queryByTestId('topbar.signin')).toBeNull();
    expect(await screen.findByTestId('topbar.notifications')).toBeOnTheScreen();
  });

  it('Saved jobs, Govt Jobs and International Jobs ask to sign in, then open what was asked for', async () => {
    const app = await openApp();
    await fireEvent.press(await screen.findByTestId('home.link.saved'));
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
    await signInNow();
    expect(await screen.findByTestId('saved.screen')).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/saved-jobs');
  });

  it('saving a job asks to sign in, then brings the visitor back to the same job', async () => {
    const app = await openApp();
    await fireEvent.press(await screen.findByTestId('job.open.j1'));
    await fireEvent.press(await screen.findByTestId('job.savebutton'));
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
    await signInNow();
    expect(await screen.findByTestId('job.header')).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/job/j1');
  });

  it('the bookmark on a job card asks to sign in and returns to the feed', async () => {
    const app = await openApp();
    await fireEvent.press(await screen.findByTestId('job.save.j1'));
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
    await signInNow();
    expect(await screen.findByTestId('home.screen')).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/');
  });

  it('applying asks to sign in, then continues to the application', async () => {
    const app = await openApp();
    await fireEvent.press(await screen.findByTestId('job.open.j1'));
    await fireEvent.press(await screen.findByTestId('job.apply'));
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
    await signInNow();
    await waitFor(() => expect(app.getPathname()).toBe('/apply/j1'), { timeout: 4000 });
  });

  it('Back from the login screen returns to what the visitor was looking at', async () => {
    const app = await openApp();
    await fireEvent.press(await screen.findByTestId('job.open.j1'));
    await fireEvent.press(await screen.findByTestId('job.savebutton'));
    await screen.findByTestId('login.screen');
    await act(async () => router.back());
    expect(await screen.findByTestId('job.header')).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/job/j1');
  });
});

describe('searching and filtering (website: text and city are open, filters and categories need an account)', () => {
  it('a guest can search by role and city on the Search tab', async () => {
    await openApp();
    await fireEvent.press(screen.getByTestId('tabs.search'));
    await fireEvent.changeText(await screen.findByTestId('search.query'), 'Technician');
    expect(await screen.findByTestId('job.card.j2')).toBeOnTheScreen();
    expect(screen.queryByTestId('job.card.j1')).toBeNull();
    expect(screen.queryByTestId('login.screen')).toBeNull();
  });

  it('the Filters button asks a guest to sign in, and signing in returns to Search', async () => {
    const app = await openApp();
    await fireEvent.press(screen.getByTestId('tabs.search'));
    await fireEvent.press(await screen.findByTestId('search.filters'));
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
    await signInNow();
    expect(await screen.findByTestId('search.screen')).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/search');
  });

  it('a category on Home asks a guest to sign in', async () => {
    await openApp();
    await fireEvent.press(await screen.findByTestId('categories.chip.Nurses'));
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
  });

  it('"All Roles" needs no account (nothing to filter)', async () => {
    await openApp();
    await fireEvent.press(await screen.findByTestId('categories.chip.all'));
    expect(screen.queryByTestId('login.screen')).toBeNull();
  });
});

describe('review findings (independent review, 2026-11-01)', () => {
  it('job data fetched as a guest is fetched again after signing in (match scores come only with a token)', async () => {
    await openApp();
    await screen.findByTestId('job.card.j1');
    const before = seen.filter((p) => p === '/api/jobs').length;
    await fireEvent.press(screen.getByTestId('topbar.signin'));
    await signInNow();
    await screen.findByTestId('home.screen');
    await waitFor(() => expect(seen.filter((p) => p === '/api/jobs').length).toBeGreaterThan(before));
  });

  it('a double tap on Save opens one sign-in screen, and signing in still returns to the job', async () => {
    const app = await openApp();
    await fireEvent.press(await screen.findByTestId('job.open.j1'));
    const save = await screen.findByTestId('job.savebutton');
    await fireEvent.press(save);
    await fireEvent.press(save);
    await screen.findByTestId('login.screen');
    await signInNow();
    expect(await screen.findByTestId('job.header')).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/job/j1');
    // Back goes to the feed, not to a second sign-in screen.
    await act(async () => router.back());
    expect(await screen.findByTestId('home.screen')).toBeOnTheScreen();
    expect(screen.queryByTestId('login.screen')).toBeNull();
  });

  it('a session that ends while a job is open sends the visitor to login with the reason', async () => {
    await renderRouter(appRoutes, { initialUrl: '/' });
    await screen.findByTestId('topbar');
    await act(async () => useSession.setState({ status: 'signedIn', user: null as never }));
    await fireEvent.press(await screen.findByTestId('job.open.j1'));
    await screen.findByTestId('job.header');
    await act(async () => useSession.getState().signOut('expired'));
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
    expect(screen.getByTestId('login.notice')).toHaveTextContent('Your session has expired. Please sign in again.');
  });

  it('"Browse jobs without signing in" after signing out of Settings leaves one tabs screen, not two', async () => {
    await openApp();
    await act(async () => useSession.setState({ status: 'signedIn', user: null as never }));
    await act(async () => router.push('/settings'));
    await fireEvent.press(await screen.findByTestId('settings.signout'));
    await screen.findByTestId('login.screen');
    await fireEvent.press(screen.getByTestId('login.browse'));
    expect(await screen.findByTestId('home.screen')).toBeOnTheScreen();
    expect(router.canGoBack()).toBe(false);
  });
});
