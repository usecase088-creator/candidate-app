// Push inside the running app: tapping a notification opens its screen, Settings can turn push on, sign-out forgets the phone.
import * as Device from 'expo-device';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { TOKEN_KEY } from '@/features/auth/sessionStore';
import { secureStorage } from '@/lib/secureStorage';
import { appRoutes } from '@/test/appRoutes';
import { meResponse } from '@/test/fixtures/auth';
import { applicantMe } from '@/test/fixtures/applications';
import { API } from '@/test/msw/handlers';
import { installJobsBackend } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';

import { resetPushListenerForTests } from '../PushListener';
import { PUSH_TOKEN_KEY } from '../pushService';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-device', () => ({ isDevice: true }));

// The shared Jest stand-in (__mocks__/expo-notifications.ts) has one more export than the real module.
const emit = (data: Record<string, unknown>) =>
  (
    Notifications as unknown as { emitNotificationResponse: (d: Record<string, unknown>) => void }
  ).emitNotificationResponse(data);

let calls: string[];
beforeEach(() => {
  resetAppState();
  resetPushListenerForTests();
  jest.mocked(useFonts).mockReturnValue([true, null]);
  jest.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValue(null);
  jest
    .mocked(Notifications.getPermissionsAsync)
    .mockResolvedValue({ status: 'undetermined', granted: false, canAskAgain: true } as never);
  calls = [];
  installJobsBackend({ me: applicantMe });
  server.use(
    http.post(`${API}/api/push-tokens`, () => {
      calls.push('POST');
      return HttpResponse.json({ success: true });
    }),
    http.delete(`${API}/api/push-tokens`, () => {
      calls.push('DELETE');
      return HttpResponse.json({ success: true });
    }),
    http.get(`${API}/api/applications`, () => HttpResponse.json([])),
  );
});

describe('tapping a notification', () => {
  it('opens the screen its link points to', async () => {
    await startSignedIn('/profile', 'profile.screen');
    await act(async () => emit({ link: '/applications' }));
    expect(await screen.findByTestId('applications.screen')).toBeOnTheScreen();
  });

  it('opens an application from its id', async () => {
    await startSignedIn('/profile', 'profile.screen');
    await act(async () => emit({ applicationId: 'app-1' }));
    expect(await screen.findByTestId('application.screen')).toBeOnTheScreen();
  });

  it('ignores a payload it does not understand', async () => {
    await startSignedIn('/profile', 'profile.screen');
    await act(async () => emit({ link: 'https://evil.example/x' }));
    expect(screen.getByTestId('profile.screen')).toBeOnTheScreen();
  });

  it('opens the screen of the notification that started the app', async () => {
    jest.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValue({
      notification: { request: { content: { data: { link: '/saved-jobs' } } } },
    } as never);
    await secureStorage.setItem(TOKEN_KEY, 'stored-token');
    server.use(http.get(`${API}/api/auth/me`, () => HttpResponse.json(meResponse)));
    await renderRouter(appRoutes, { initialUrl: '/profile' });
    expect(await screen.findByTestId('saved.back')).toBeOnTheScreen();
  });
});

describe('Settings: notifications', () => {
  it('turns notifications on and says so', async () => {
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValueOnce({ status: 'undetermined', granted: false, canAskAgain: true } as never)
      .mockResolvedValueOnce({ status: 'undetermined', granted: false, canAskAgain: true } as never)
      .mockResolvedValue({ status: 'granted', granted: true, canAskAgain: true } as never);
    await startSignedIn('/settings', 'settings.screen');
    await fireEvent.press(await screen.findByTestId('settings.push'));
    await waitFor(() => expect(calls).toEqual(['POST']));
    expect(await screen.findByTestId('settings.push.status')).toHaveTextContent('Notifications are on');
  });

  it('shows that notifications are already on', async () => {
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue({ status: 'granted', granted: true, canAskAgain: true } as never);
    await startSignedIn('/settings', 'settings.screen');
    expect(await screen.findByTestId('settings.push.status')).toHaveTextContent('Notifications are on');
    expect(screen.queryByTestId('settings.push')).toBeNull();
  });

  it('points to the phone settings after a refusal', async () => {
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue({ status: 'denied', granted: false, canAskAgain: false } as never);
    await startSignedIn('/settings', 'settings.screen');
    expect(await screen.findByTestId('settings.push.status')).toHaveTextContent(/turned off/);
    expect(screen.getByTestId('settings.push.open')).toBeOnTheScreen();
  });

  it('says nothing about push on a phone that cannot do it (emulator)', async () => {
    (Device as { isDevice: boolean }).isDevice = false;
    await startSignedIn('/settings', 'settings.screen');
    expect(screen.queryByTestId('settings.push')).toBeNull();
    expect(screen.queryByTestId('settings.push.status')).toBeNull();
    (Device as { isDevice: boolean }).isDevice = true;
  });
});

describe('sign out', () => {
  it('removes this phone from the server before the session ends', async () => {
    await secureStorage.setItem(PUSH_TOKEN_KEY, 'ExponentPushToken[abc]');
    await startSignedIn('/settings', 'settings.screen');
    await fireEvent.press(screen.getByTestId('settings.signout'));
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
    expect(calls).toEqual(['DELETE']);
  });

  it('still signs out when the server cannot be reached', async () => {
    await secureStorage.setItem(PUSH_TOKEN_KEY, 'ExponentPushToken[abc]');
    server.use(http.delete(`${API}/api/push-tokens`, () => HttpResponse.error()));
    await startSignedIn('/settings', 'settings.screen');
    await fireEvent.press(screen.getByTestId('settings.signout'));
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
  });
});
