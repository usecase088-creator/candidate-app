// Push inside the running app: tapping a notification opens its screen, Settings can turn push on, sign-out forgets the phone.
import * as Device from 'expo-device';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { AccessibilityInfo, Linking, StyleSheet } from 'react-native';
import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { TOKEN_KEY } from '@/features/auth/sessionStore';
import { secureStorage } from '@/lib/secureStorage';
import { appRoutes } from '@/test/appRoutes';
import { meResponse } from '@/test/fixtures/auth';
import { applicantMe } from '@/test/fixtures/applications';
import { API } from '@/test/msw/handlers';
import { installJobsBackend } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { colors } from '@/theme/tokens';
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
    expect(await screen.findByTestId('saved.screen')).toBeOnTheScreen();
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

  it('offers to turn notifications on when Android has not asked yet (reported as "denied")', async () => {
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue({ status: 'denied', granted: false, canAskAgain: true } as never);
    await startSignedIn('/settings', 'settings.screen');
    expect(await screen.findByTestId('settings.push')).toBeOnTheScreen();
    expect(screen.queryByTestId('settings.push.open')).toBeNull();
  });

  it('points to the phone settings after a refusal', async () => {
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue({ status: 'denied', granted: false, canAskAgain: false } as never);
    await startSignedIn('/settings', 'settings.screen');
    expect(await screen.findByTestId('settings.push.status')).toHaveTextContent(/turned off/);
    // D32 R2 (issue 19): "Open phone settings" is a row of the Notifications group, not a loose link under it.
    const group = within(screen.getByTestId('settings.group.notifications'));
    expect(group.getByTestId('settings.push.open')).toHaveTextContent('Open phone settings');
    expect(group.getByTestId('settings.push.open.chevron')).toBeOnTheScreen();
  });

  it('R3 #5: when on, the row is a switch that opens the phone settings (it can only be turned off there)', async () => {
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue({ status: 'granted', granted: true, canAskAgain: true } as never);
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await startSignedIn('/settings', 'settings.screen');
    const row = await screen.findByRole('switch', { name: 'Push notifications', checked: true });
    expect(row.props.accessibilityHint).toBe('Opens your phone settings to turn notifications off');
    await fireEvent.press(row);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('R3 #5: after a refusal, the off row opens the phone settings too', async () => {
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue({ status: 'denied', granted: false, canAskAgain: false } as never);
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    open.mockClear();
    await startSignedIn('/settings', 'settings.screen');
    const row = await screen.findByRole('switch', { name: 'Push notifications', checked: false });
    expect(row.props.accessibilityHint).toBe('Opens your phone settings to turn notifications on');
    await fireEvent.press(row);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('R3 a11y: not asked yet, the row is a switch that is off; the off track has a 3:1 outline colour', async () => {
    await startSignedIn('/settings', 'settings.screen');
    expect(await screen.findByRole('switch', { name: 'Push notifications', checked: false })).toBe(
      screen.getByTestId('settings.push'),
    );
    const sw = screen.getByTestId('settings.push.switch', { includeHiddenElements: true });
    expect(sw.props.tintColor).toBe(colors.controlBorder);
    expect(StyleSheet.flatten(sw.props.style)?.backgroundColor).toBe(colors.controlBorder);
  });

  it('R3 a11y P1-1: a failure to turn on is spoken', async () => {
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue({ status: 'undetermined', granted: false, canAskAgain: true } as never);
    jest
      .mocked(Notifications.requestPermissionsAsync)
      .mockResolvedValueOnce({ status: 'granted', granted: true, canAskAgain: true } as never);
    jest.mocked(Notifications.getExpoPushTokenAsync).mockRejectedValueOnce(new Error('no token'));
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    announce.mockClear();
    await startSignedIn('/settings', 'settings.screen');
    await fireEvent.press(await screen.findByTestId('settings.push'));
    expect(await screen.findByTestId('settings.push.error')).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith('Could not turn on notifications. Please try again later.');
    jest.mocked(Notifications.requestPermissionsAsync).mockClear();
  });

  it('says nothing about push on a phone that cannot do it (emulator)', async () => {
    (Device as { isDevice: boolean }).isDevice = false;
    await startSignedIn('/settings', 'settings.screen');
    expect(screen.queryByTestId('settings.push')).toBeNull();
    expect(screen.queryByTestId('settings.push.status')).toBeNull();
    (Device as { isDevice: boolean }).isDevice = true;
  });
});

describe('signed in with notifications already allowed', () => {
  it('registers this phone with the server without asking', async () => {
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue({ status: 'granted', granted: true, canAskAgain: true } as never);
    await startSignedIn('/settings', 'settings.screen');
    await waitFor(() => expect(calls).toEqual(['POST']));
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('registers nothing while notifications are not allowed', async () => {
    await startSignedIn('/settings', 'settings.screen');
    expect(await screen.findByTestId('settings.push')).toBeOnTheScreen();
    expect(calls).toEqual([]);
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
