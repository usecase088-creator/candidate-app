import { useFonts } from 'expo-font';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';
import { http, HttpResponse } from 'msw';

import { resetSessionForTests, TOKEN_KEY, useSession } from '@/features/auth/sessionStore';
import { secureStorage } from '@/lib/secureStorage';
import { appRoutes } from '@/test/appRoutes';
import { loginResponse, recruiterUser } from '@/test/fixtures/auth';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

const fake = SecureStore as typeof SecureStore & { __reset: () => void };

function mockLogin(reply: () => Response) {
  const sent: unknown[] = [];
  server.use(
    http.post(`${API}/api/auth/login`, async ({ request }) => {
      sent.push(await request.json());
      return reply();
    }),
  );
  return sent;
}

async function openLogin() {
  await renderRouter(appRoutes, { initialUrl: '/login' });
  await screen.findByTestId('login.screen');
}

async function fill(email: string, password: string) {
  await fireEvent.changeText(screen.getByTestId('login.email'), email);
  await fireEvent.changeText(screen.getByTestId('login.password'), password);
}

const submit = () => fireEvent.press(screen.getByTestId('login.submit'));
const redBox = () => screen.getByTestId('login.error');

beforeEach(() => {
  fake.__reset();
  resetSessionForTests();
  jest.mocked(useFonts).mockReturnValue([true, null]);
});

describe('layout (website wording)', () => {
  it('shows the sign-in form', async () => {
    await openLogin();
    expect(screen.getByRole('header', { name: 'Welcome back' })).toBeOnTheScreen();
    expect(screen.getByText('Sign in to access your saved jobs and applications.')).toBeOnTheScreen();
    expect(screen.getByText('Email *')).toBeOnTheScreen();
    expect(screen.getByText('Password *')).toBeOnTheScreen();
    expect(screen.getByTestId('login.email').props).toMatchObject({
      placeholder: 'you@example.com',
      keyboardType: 'email-address',
      autoCapitalize: 'none',
      returnKeyType: 'next',
    });
    expect(screen.getByTestId('login.password').props.returnKeyType).toBe('done');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Forgot password?' })).toBeOnTheScreen();
    expect(screen.getByText('New to ApronHanger?')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Create an account' })).toBeOnTheScreen();
  });

  it('has the Sign In / Create Account tabs, Sign In selected', async () => {
    await openLogin();
    expect(screen.getByTestId('auth.tab.signin').props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByTestId('auth.tab.signup'));
    expect(await screen.findByTestId('signup.screen')).toBeOnTheScreen();
  });
});

describe('validation', () => {
  it('shows each error under its field and the first one in the red box, without calling the API', async () => {
    await openLogin();
    await fill('asha@', '');
    await submit();
    expect(screen.getByTestId('login.email.error')).toHaveTextContent('Enter a valid email');
    expect(screen.getByTestId('login.password.error')).toHaveTextContent('Password is required');
    expect(redBox()).toHaveTextContent('Enter a valid email');
  });
});

describe('sign in', () => {
  it('sends the email as typed, says "Welcome back!", plays the animation, then opens Home after 1.2 s', async () => {
    const sent = mockLogin(() => HttpResponse.json(loginResponse));
    await openLogin();
    await fill('Candidate@apronhanger.test', 'Test@1234');
    await submit();

    expect(sent[0]).toEqual({ email: 'Candidate@apronhanger.test', password: 'Test@1234' });
    expect(await screen.findByTestId('toast')).toHaveTextContent('Welcome back!');
    expect(screen.getByTestId('login.success', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Please wait…' })).toBeDisabled();

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });
    expect(await screen.findByTestId('home.screen')).toBeOnTheScreen();
    await expect(secureStorage.getItem(TOKEN_KEY)).resolves.toBe('test.jwt.token');
  });

  it('submits from the keyboard "done" key on the password field', async () => {
    const sent = mockLogin(() => HttpResponse.json(loginResponse));
    await openLogin();
    await fill('candidate@apronhanger.test', 'Test@1234');
    await fireEvent(screen.getByTestId('login.password'), 'submitEditing');
    await screen.findByTestId('toast');
    expect(sent).toHaveLength(1);
  });

  it('rejects a recruiter account with the website message and keeps no token', async () => {
    mockLogin(() => HttpResponse.json({ token: 'rec-token', user: recruiterUser }));
    await openLogin();
    await fill('recruiter@apronhanger.test', 'Test@1234');
    await submit();
    const message =
      'This email is registered as a recruiter account. Please sign in on the Recruiter Portal instead.';
    expect(await screen.findByTestId('login.error')).toHaveTextContent(message);
    expect(screen.getByTestId('toast')).toHaveTextContent(message);
    await expect(secureStorage.getItem(TOKEN_KEY)).resolves.toBeNull();
    expect(useSession.getState().status).toBe('signedOut');
  });

  it.each([
    [401, { error: 'Invalid email or password' }, 'Invalid email or password. Please try again.'],
    [
      403,
      { error: 'Your account has been suspended. Please contact support.' },
      'Your account has been suspended. Please contact support.',
    ],
    [
      429,
      { error: 'Too many login attempts, please try again after 15 minutes' },
      'Too many login attempts, please try again after 15 minutes',
    ],
    [500, { error: 'Login failed' }, 'Server error. Please try again in a moment.'],
  ])('HTTP %i shows "%s" in the red box and a toast', async (status, body, message) => {
    mockLogin(() => HttpResponse.json(body, { status }));
    await openLogin();
    await fill('candidate@apronhanger.test', 'wrong');
    await submit();
    expect(await screen.findByTestId('login.error')).toHaveTextContent(message);
    expect(screen.getByTestId('toast')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('shows the network message when offline (no retry for POST)', async () => {
    let calls = 0;
    mockLogin(() => {
      calls += 1;
      return HttpResponse.error();
    });
    await openLogin();
    await fill('candidate@apronhanger.test', 'Test@1234');
    await submit();
    expect(await screen.findByTestId('login.error')).toHaveTextContent(
      'Network error. Please check your connection and try again.',
    );
    expect(calls).toBe(1);
  });
});

describe('why the user is here (D18)', () => {
  it('explains an expired session', async () => {
    await act(() => useSession.getState().signOut('expired'));
    await openLogin();
    expect(screen.getByTestId('login.notice')).toHaveTextContent(
      'Your session has expired. Please sign in again.',
    );
  });

  it('shows the backend message for a blocked account', async () => {
    await act(() => useSession.getState().signOut('blocked', 'Account not found.'));
    await openLogin();
    expect(screen.getByTestId('login.notice')).toHaveTextContent('Account not found.');
  });

  it('says nothing after a normal sign-out', async () => {
    await act(() => useSession.getState().signOut('user'));
    await openLogin();
    expect(screen.queryByTestId('login.notice')).toBeNull();
  });
});

describe('links', () => {
  it('Forgot password? opens the reset flow', async () => {
    await openLogin();
    await fireEvent.press(screen.getByTestId('login.forgot'));
    expect(await screen.findByTestId('forgot.screen')).toBeOnTheScreen();
  });

  it('Create an account opens signup', async () => {
    await openLogin();
    await fireEvent.press(screen.getByTestId('login.signup'));
    expect(await screen.findByTestId('signup.screen')).toBeOnTheScreen();
  });
});
