import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { delay, http, HttpResponse } from 'msw';

import { resetSessionForTests, TOKEN_KEY, useSession } from '@/features/auth/sessionStore';
import { appQueryClient } from '@/lib/queryClient';
import { secureStorage } from '@/lib/secureStorage';
import { appRoutes as routes } from '@/test/appRoutes';
import { candidateUser, meResponse } from '@/test/fixtures/auth';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';

type App = Awaited<ReturnType<typeof renderRouter>>;

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

const fake = SecureStore as typeof SecureStore & { __reset: () => void };
const mockMe = (reply: () => Response | Promise<Response>) =>
  server.use(http.get(`${API}/api/auth/me`, reply));

async function startSignedIn(initialUrl = '/', expectScreen = 'home.screen'): Promise<App> {
  await secureStorage.setItem(TOKEN_KEY, 'stored-token');
  mockMe(() => HttpResponse.json(meResponse));
  const app = await renderRouter(routes, { initialUrl });
  await screen.findByTestId(expectScreen);
  return app;
}

async function startSignedOut(initialUrl = '/'): Promise<App> {
  const app = await renderRouter(routes, { initialUrl });
  await screen.findByTestId('login.screen');
  return app;
}

beforeEach(() => {
  fake.__reset();
  jest.clearAllMocks();
  resetSessionForTests();
  jest.mocked(useFonts).mockReturnValue([true, null]);
});

describe('start-up', () => {
  it('signed out: opens the login screen', async () => {
    const app = await startSignedOut();
    expect(app.getPathname()).toBe('/login');
  });

  it('signed in: restores the session and opens Home', async () => {
    const app = await startSignedIn();
    expect(app.getPathname()).toBe('/');
    expect(useSession.getState().user?.email).toBe(candidateUser.email);
  });

  it('keeps the splash up until the session check finishes', async () => {
    await secureStorage.setItem(TOKEN_KEY, 'stored-token');
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => (release = r));
    mockMe(async () => {
      await gate;
      return HttpResponse.json(meResponse);
    });
    await renderRouter(routes, { initialUrl: '/' });
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
    await act(async () => release());
    await screen.findByTestId('home.screen');
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('an expired token lands on login', async () => {
    await secureStorage.setItem(TOKEN_KEY, 'old-token');
    mockMe(() => HttpResponse.json({ error: 'Invalid or expired token' }, { status: 401 }));
    await startSignedOut();
    expect(useSession.getState().signOutReason).toBe('expired');
    expect(screen.getByTestId('login.notice')).toHaveTextContent(
      'Your session has expired. Please sign in again.',
    );
  });

  it('offline with a saved session still opens Home', async () => {
    await secureStorage.setItem(TOKEN_KEY, 'stored-token');
    mockMe(async () => {
      await delay(1);
      return HttpResponse.error();
    });
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByTestId('home.screen')).toBeOnTheScreen();
  });
});

describe('guards', () => {
  it('signed out: a deep link to a tab goes to login', async () => {
    const app = await startSignedOut('/profile');
    expect(app.getPathname()).toBe('/login');
  });

  it('signed out: signup and forgot password are reachable', async () => {
    await startSignedOut();
    await act(() => router.push('/signup'));
    expect(await screen.findByTestId('signup.screen')).toBeOnTheScreen();
    await act(() => router.push('/forgot-password'));
    expect(await screen.findByTestId('forgot.screen')).toBeOnTheScreen();
  });

  it('signed in: auth screens are not reachable', async () => {
    await startSignedIn();
    await act(() => router.push('/login'));
    expect(screen.queryByTestId('login.screen')).toBeNull();
    expect(screen.getByTestId('home.screen')).toBeOnTheScreen();
  });
});

describe('tabs', () => {
  it('has Home, Search, Applications and Profile', async () => {
    await startSignedIn();
    for (const [id, name] of [
      ['tabs.home', 'Home'],
      ['tabs.search', 'Search'],
      ['tabs.applications', 'Applications'],
      ['tabs.profile', 'Profile'],
    ]) {
      expect(screen.getByTestId(id)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeOnTheScreen();
    }
  });

  it('switches tabs', async () => {
    const app = await startSignedIn();
    await fireEvent.press(screen.getByTestId('tabs.profile'));
    expect(await screen.findByTestId('profile.screen')).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/profile');
  });
});

describe('login and logout', () => {
  it('after sign-in, Home is shown and back does not return to login', async () => {
    await startSignedOut();
    await act(() => useSession.getState().signIn('new-token', candidateUser));
    expect(await screen.findByTestId('home.screen')).toBeOnTheScreen();
    expect(router.canGoBack()).toBe(false);
  });

  it('Sign out on Profile goes to login, and back does not return to the tabs', async () => {
    await startSignedIn('/profile', 'profile.screen');
    appQueryClient.setQueryData(['saved-jobs'], ['job-1']);
    await fireEvent.press(await screen.findByTestId('profile.signout'));
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
    expect(router.canGoBack()).toBe(false);
    await expect(secureStorage.getItem(TOKEN_KEY)).resolves.toBeNull();
    // Task 8: no data from the previous user survives a sign-out.
    expect(appQueryClient.getQueryData(['saved-jobs'])).toBeUndefined();
  });

  it('a 401 anywhere while signed in sends the user to login', async () => {
    await startSignedIn();
    await act(() => useSession.getState().signOut('expired'));
    await waitFor(() => expect(screen.getByTestId('login.screen')).toBeOnTheScreen());
  });
});
