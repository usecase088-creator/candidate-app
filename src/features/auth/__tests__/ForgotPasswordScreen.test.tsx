import { useFonts } from 'expo-font';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';
import { http, HttpResponse } from 'msw';
import { StyleSheet } from 'react-native';

import { resetSessionForTests } from '@/features/auth/sessionStore';
import { appRoutes } from '@/test/appRoutes';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

const fake = SecureStore as typeof SecureStore & { __reset: () => void };
const HIDDEN = { includeHiddenElements: true };

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

const ok = (body: object) => () => HttpResponse.json(body);
const expectToast = async (text: string) =>
  expect(await screen.findByTestId('toast')).toHaveTextContent(text);
const submit = () => fireEvent.press(screen.getByTestId('forgot.submit'));

async function open() {
  await renderRouter(appRoutes, { initialUrl: '/forgot-password' });
  await screen.findByTestId('forgot.screen');
}

async function toOtpStep() {
  mockPost(
    '/api/auth/forgot-password',
    ok({ message: 'If an account exists for this number, an OTP has been sent.' }),
  );
  await open();
  await fireEvent.changeText(screen.getByTestId('forgot.mobile'), '9000000001');
  await submit();
  await screen.findByTestId('forgot.otp');
}

async function toResetStep() {
  await toOtpStep();
  mockPost(
    '/api/auth/verify-otp',
    ok({ message: 'OTP verified', reset_token: 'reset-tok', maskedEmail: 'c***e@apronhanger.test' }),
  );
  // Typing the 6th digit submits the code (D32 OtpInput onComplete); no press needed.
  await fireEvent.changeText(screen.getByTestId('forgot.otp'), '123456');
  await screen.findByTestId('forgot.password');
}

beforeEach(() => {
  fake.__reset();
  resetSessionForTests();
  jest.mocked(useFonts).mockReturnValue([true, null]);
});

describe('phone step', () => {
  it('shows the website text', async () => {
    await open();
    expect(screen.getByRole('header', { name: 'Reset Password' })).toBeOnTheScreen();
    expect(screen.getByText('Enter your registered mobile number to receive an OTP.')).toBeOnTheScreen();
    expect(screen.getByText('Mobile Number')).toBeOnTheScreen();
    expect(screen.getByTestId('forgot.mobile').props).toMatchObject({
      placeholder: 'Enter 10-digit number',
      keyboardType: 'phone-pad',
    });
    expect(screen.getByRole('button', { name: 'Send OTP' })).toBeOnTheScreen();
  });

  it('asks for a number when empty (toast only, like the website)', async () => {
    await open();
    await submit();
    expect(screen.getByTestId('toast')).toHaveTextContent('Please enter your registered mobile number.');
  });

  it('sends the OTP for the number as typed and moves on', async () => {
    const sent = mockPost('/api/auth/forgot-password', ok({ message: 'sent' }));
    await open();
    await fireEvent.changeText(screen.getByTestId('forgot.mobile'), '90000 00001');
    await submit();
    expect(await screen.findByTestId('forgot.otp')).toBeOnTheScreen();
    expect(sent[0]).toEqual({ mobile: '90000 00001', role: 'CANDIDATE' });
    expect(screen.getByTestId('toast')).toHaveTextContent('OTP sent to your mobile number.');
    expect(screen.getByRole('header', { name: 'Verify & Reset' })).toBeOnTheScreen();
    expect(screen.getByText('Enter the OTP sent to 90000 00001.')).toBeOnTheScreen();
    expect(screen.getByTestId('forgot.mailSent', HIDDEN)).toBeOnTheScreen();
  });

  it.each([
    [
      { error: 'Too many OTP requests, please try again after 15 minutes' },
      429,
      'Too many OTP requests, please try again after 15 minutes',
    ],
    [{}, 500, 'Failed to send OTP. Please check your number.'],
  ])('shows the server error or the website fallback (%o, %i)', async (body, status, message) => {
    mockPost('/api/auth/forgot-password', () => HttpResponse.json(body, { status }));
    await open();
    await fireEvent.changeText(screen.getByTestId('forgot.mobile'), '9000000001');
    await submit();
    await expectToast(message);
  });

  it('uses the forgot-password network message', async () => {
    mockPost('/api/auth/forgot-password', () => HttpResponse.error());
    await open();
    await fireEvent.changeText(screen.getByTestId('forgot.mobile'), '9000000001');
    await submit();
    await expectToast('Network error. Please try again.');
  });

  it('"Back to Sign In" returns to login', async () => {
    await open();
    // D32: an in-content 44-pt back control at the top; its spoken name stays the website text.
    expect(screen.getByRole('button', { name: 'Back to Sign In' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('forgot.back'));
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
  });
});

describe('OTP step', () => {
  it('needs 6 digits', async () => {
    await toOtpStep();
    await fireEvent.changeText(screen.getByTestId('forgot.otp'), '12');
    await submit();
    expect(screen.getByTestId('toast')).toHaveTextContent('Please enter a valid 6-digit OTP.');
  });

  it('shows a wrong OTP with the server message', async () => {
    await toOtpStep();
    mockPost('/api/auth/verify-otp', () =>
      HttpResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 }),
    );
    await fireEvent.changeText(screen.getByTestId('forgot.otp'), '000000');
    await submit();
    await expectToast('Invalid or expired OTP');
  });

  it('typing the 6th digit verifies on its own, once, even if Verify OTP is pressed as well', async () => {
    await toOtpStep();
    const sent = mockPost(
      '/api/auth/verify-otp',
      ok({ message: 'OTP verified', reset_token: 'reset-tok', maskedEmail: 'c***e@apronhanger.test' }),
    );
    await fireEvent.changeText(screen.getByTestId('forgot.otp'), '123456');
    // No press yet: the 6th digit alone sends the code.
    await waitFor(() => expect(sent).toHaveLength(1));
    await submit();
    expect(await screen.findByTestId('forgot.password')).toBeOnTheScreen();
    expect(sent).toHaveLength(1);
  });

  it('"Change Mobile Number" goes back to the phone step', async () => {
    await toOtpStep();
    await fireEvent.press(screen.getByTestId('forgot.change'));
    expect(screen.getByTestId('forgot.mobile')).toBeOnTheScreen();
  });
});

describe('reset step', () => {
  it('names the account with the masked email', async () => {
    await toResetStep();
    expect(screen.getByText('Set a new password for c***e@apronhanger.test')).toBeOnTheScreen();
    expect(screen.getByText('New Password')).toBeOnTheScreen();
  });

  it('checks the new password with the website messages (full stops)', async () => {
    await toResetStep();
    await fireEvent.changeText(screen.getByTestId('forgot.password'), 'secret@123');
    await submit();
    expect(screen.getByTestId('toast')).toHaveTextContent(
      'Password must contain at least one uppercase letter.',
    );
  });

  it('"Start Over" goes back to the phone step', async () => {
    await toResetStep();
    await fireEvent.press(screen.getByTestId('forgot.restart'));
    expect(screen.getByTestId('forgot.mobile')).toBeOnTheScreen();
  });

  it('resets, shows success, then returns to login after 2.5 s', async () => {
    await toResetStep();
    const sent = mockPost('/api/auth/reset-password', ok({ message: 'Password reset successfully' }));
    await fireEvent.changeText(screen.getByTestId('forgot.password'), 'NewSecret@1');
    await submit();
    expect(await screen.findByRole('header', { name: 'Success!' })).toBeOnTheScreen();
    expect(sent[0]).toEqual({ reset_token: 'reset-tok', new_password: 'NewSecret@1', role: 'CANDIDATE' });
    expect(screen.getByText('Your password has been reset successfully.')).toBeOnTheScreen();
    expect(screen.getByTestId('toast')).toHaveTextContent(
      'Password reset successfully! Please sign in with your new password.',
    );
    expect(screen.getByTestId('forgot.done', HIDDEN)).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(2500);
    });
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
  });

  it('the success step has a Sign in button that goes to login right away (D32)', async () => {
    await toResetStep();
    mockPost('/api/auth/reset-password', ok({ message: 'Password reset successfully' }));
    await fireEvent.changeText(screen.getByTestId('forgot.password'), 'NewSecret@1');
    await submit();
    // Only the success step is centred.
    expect(
      StyleSheet.flatten((await screen.findByRole('header', { name: 'Success!' })).props.style),
    ).toMatchObject({ textAlign: 'center' });
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
  });
});

describe('layout (D32)', () => {
  it('keeps the hero in a fixed slot so the title does not jump between steps', async () => {
    await toOtpStep();
    const otpHero = StyleSheet.flatten(screen.getByTestId('forgot.hero').props.style);
    await fireEvent.press(screen.getByTestId('forgot.change'));
    const phoneHero = StyleSheet.flatten(screen.getByTestId('forgot.hero').props.style);
    expect(phoneHero.height).toBeGreaterThan(0);
    expect(phoneHero.height).toBe(otpHero.height);
    // Form steps: title left-aligned with the form.
    expect(
      StyleSheet.flatten(screen.getByRole('header', { name: 'Reset Password' }).props.style),
    ).toMatchObject({ fontSize: 28 });
  });
});
