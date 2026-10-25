import { useFonts } from 'expo-font';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { http, HttpResponse } from 'msw';

import { resetSessionForTests, TOKEN_KEY } from '@/features/auth/sessionStore';
import { secureStorage } from '@/lib/secureStorage';
import { appRoutes } from '@/test/appRoutes';
import { candidateUser } from '@/test/fixtures/auth';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(() => Promise.resolve()) }));

const fake = SecureStore as typeof SecureStore & { __reset: () => void };

function mockPost(path: string, reply: () => Response) {
  const sent: unknown[] = [];
  server.use(
    http.post(`${API}${path}`, async ({ request }) => {
      sent.push(await request.json());
      return reply();
    }),
  );
  return sent;
}

const draft = {
  name: 'Asha Rao',
  mobile: '9000000002',
  email: 'asha@apronhanger.test',
  password: 'Secret@123',
};

async function openSignup() {
  await renderRouter(appRoutes, { initialUrl: '/signup' });
  await screen.findByTestId('signup.screen');
}

async function fillDetails(values: Partial<typeof draft> = {}) {
  const v = { ...draft, ...values };
  await fireEvent.changeText(screen.getByTestId('signup.name'), v.name);
  await fireEvent.changeText(screen.getByTestId('signup.mobile'), v.mobile);
  await fireEvent.changeText(screen.getByTestId('signup.email'), v.email);
  await fireEvent.changeText(screen.getByTestId('signup.password'), v.password);
}

async function accept() {
  await fireEvent.press(screen.getByTestId('signup.terms'));
  await fireEvent.press(screen.getByTestId('signup.privacy'));
}

const submit = () => fireEvent.press(screen.getByTestId('signup.submit'));

async function reachOtpStep() {
  mockPost('/api/auth/signup/send-otp', () =>
    HttpResponse.json({ message: 'If this number is eligible for signup, an OTP has been sent.' }),
  );
  await openSignup();
  await fillDetails();
  await accept();
  await submit();
  await screen.findByTestId('signup.otp');
}

beforeEach(() => {
  fake.__reset();
  resetSessionForTests();
  jest.clearAllMocks();
  jest.mocked(useFonts).mockReturnValue([true, null]);
});

describe('details step', () => {
  it('shows the website form, requirements and consent boxes', async () => {
    await openSignup();
    expect(screen.getByRole('header', { name: 'Create your account' })).toBeOnTheScreen();
    expect(screen.getByText('Candidate')).toBeOnTheScreen();
    expect(screen.getByText('Join 1.2L+ verified healthcare professionals across India.')).toBeOnTheScreen();
    for (const label of ['Full name *', 'Mobile Number *', 'Email *', 'Password *']) {
      expect(screen.getByText(label)).toBeOnTheScreen();
    }
    expect(screen.getByTestId('signup.mobile').props).toMatchObject({
      placeholder: '+91 9876543210',
      keyboardType: 'phone-pad',
    });
    expect(screen.getByText('Password Requirements:')).toBeOnTheScreen();
    expect(screen.getByText('At least one special character (e.g. @, #, $, etc.)')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Send OTP' })).toBeOnTheScreen();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByTestId('auth.tab.signup').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('validates with the website rules; the red box shows the first error in website order (email first)', async () => {
    await openSignup();
    await fillDetails({ name: 'A', mobile: '123', email: 'bad', password: 'weak' });
    await submit();
    expect(screen.getByTestId('signup.name.error')).toHaveTextContent('Name must be at least 2 characters');
    expect(screen.getByTestId('signup.mobile.error')).toHaveTextContent(
      'Enter a valid 10-digit phone number',
    );
    expect(screen.getByTestId('signup.password.error')).toHaveTextContent(
      'Password must be at least 8 characters',
    );
    expect(screen.getByTestId('signup.error')).toHaveTextContent('Enter a valid email');
  });

  it('needs Terms and Privacy consent (job alerts are optional)', async () => {
    await openSignup();
    await fillDetails();
    await fireEvent.press(screen.getByTestId('signup.terms'));
    await submit();
    expect(screen.getByTestId('signup.error')).toHaveTextContent(
      'Please accept the Terms & Conditions and Privacy Consent to continue.',
    );
  });

  it('opens the Terms and the Privacy Policy on the website', async () => {
    await openSignup();
    await fireEvent.press(screen.getByTestId('signup.terms.link'));
    await fireEvent.press(screen.getByTestId('signup.privacy.link'));
    expect(WebBrowser.openBrowserAsync).toHaveBeenNthCalledWith(
      1,
      'https://apronhanger.work/APRONHANGER_Work_Terms_and_Conditions.pdf',
    );
    expect(WebBrowser.openBrowserAsync).toHaveBeenNthCalledWith(
      2,
      'https://apronhanger.work/privacy-policy.html',
    );
  });

  it('sends the OTP to the mobile exactly as typed and moves to the OTP step', async () => {
    const sent = mockPost('/api/auth/signup/send-otp', () =>
      HttpResponse.json({ message: 'If this number is eligible for signup, an OTP has been sent.' }),
    );
    await openSignup();
    await fillDetails({ mobile: '+91 90000 00002' });
    await accept();
    await submit();
    expect(await screen.findByTestId('toast')).toHaveTextContent('OTP sent to your mobile number.');
    expect(sent[0]).toEqual({ mobile: '+91 90000 00002', role: 'CANDIDATE' });
    expect(screen.getByText('Enter the OTP sent to +91 90000 00002.')).toBeOnTheScreen();
    expect(screen.getByText('Mobile OTP *')).toBeOnTheScreen();
  });

  it('shows send-OTP errors in the red box and a toast (e.g. rate limit)', async () => {
    mockPost('/api/auth/signup/send-otp', () =>
      HttpResponse.json(
        { error: 'Too many OTP requests, please try again after 15 minutes' },
        { status: 429 },
      ),
    );
    await openSignup();
    await fillDetails();
    await accept();
    await submit();
    const message = 'Too many OTP requests, please try again after 15 minutes';
    expect(await screen.findByTestId('signup.error')).toHaveTextContent(message);
    expect(screen.getByTestId('toast')).toHaveTextContent(message);
  });
});

describe('OTP step', () => {
  it('"Edit signup details" goes back with the values kept (D17)', async () => {
    await reachOtpStep();
    await fireEvent.press(screen.getByTestId('signup.edit'));
    expect(screen.getByTestId('signup.name').props.value).toBe('Asha Rao');
    expect(screen.getByTestId('signup.email').props.value).toBe('asha@apronhanger.test');
    expect(screen.getByTestId('signup.terms')).toBeChecked();
  });

  it('needs 6 digits', async () => {
    await reachOtpStep();
    await fireEvent.changeText(screen.getByTestId('signup.otp'), '123');
    await submit();
    expect(screen.getByTestId('signup.error')).toHaveTextContent('Please enter a valid 6-digit OTP.');
  });

  it('shows a wrong OTP with the backend message', async () => {
    await reachOtpStep();
    mockPost('/api/auth/signup/verify-otp', () =>
      HttpResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 }),
    );
    await fireEvent.changeText(screen.getByTestId('signup.otp'), '000000');
    await submit();
    expect(await screen.findByTestId('signup.error')).toHaveTextContent('Invalid or expired OTP');
  });

  it('verifies, registers with the draft, says "Account created!", then opens Home after 1.2 s', async () => {
    await reachOtpStep();
    const verify = mockPost('/api/auth/signup/verify-otp', () =>
      HttpResponse.json({ message: 'OTP verified', signup_token: 'sig-tok' }),
    );
    const register = mockPost('/api/auth/register', () =>
      HttpResponse.json({ token: 'new-token', user: candidateUser }, { status: 201 }),
    );
    await fireEvent.changeText(screen.getByTestId('signup.otp'), '123456');
    await submit();

    expect(await screen.findByText('Account created!')).toBeOnTheScreen();
    expect(verify[0]).toEqual({ mobile: '9000000002', otp: '123456', role: 'CANDIDATE' });
    expect(register[0]).toEqual({ ...draft, role: 'CANDIDATE', signup_token: 'sig-tok' });
    expect(screen.getByTestId('signup.success', { includeHiddenElements: true })).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });
    expect(await screen.findByTestId('home.screen')).toBeOnTheScreen();
    await expect(secureStorage.getItem(TOKEN_KEY)).resolves.toBe('new-token');
  });

  it('shows register errors with the website mapping (409 email taken)', async () => {
    await reachOtpStep();
    mockPost('/api/auth/signup/verify-otp', () =>
      HttpResponse.json({ message: 'OTP verified', signup_token: 't' }),
    );
    mockPost('/api/auth/register', () =>
      HttpResponse.json({ error: 'Email is already registered' }, { status: 409 }),
    );
    await fireEvent.changeText(screen.getByTestId('signup.otp'), '123456');
    await submit();
    expect(await screen.findByTestId('signup.error')).toHaveTextContent('Email is already registered');
  });
});
