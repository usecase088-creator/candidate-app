// Turning push notifications on and off. expo-notifications and expo-device are faked at their edge; the backend is MSW.
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { http, HttpResponse } from 'msw';
import { Alert } from 'react-native';

import { api } from '@/api/client';
import { secureStorage } from '@/lib/secureStorage';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';

import {
  askPushAfterApply,
  disablePush,
  enablePush,
  PUSH_ASKED_KEY,
  PUSH_TOKEN_KEY,
  pushPermission,
} from '../pushService';

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { DEFAULT: 3 },
}));
jest.mock('expo-device', () => ({ isDevice: true }));

const N = jest.mocked(Notifications);
const TOKEN = 'ExponentPushToken[abc123]';

let calls: string[];
let bodies: unknown[];
beforeEach(async () => {
  jest.clearAllMocks();
  (Device as { isDevice: boolean }).isDevice = true;
  await secureStorage.deleteItem(PUSH_TOKEN_KEY);
  await secureStorage.deleteItem(PUSH_ASKED_KEY);
  api.setAuthToken('t');
  calls = [];
  bodies = [];
  server.use(
    http.post(`${API}/api/push-tokens`, async ({ request }) => {
      calls.push('POST');
      bodies.push(await request.json());
      return HttpResponse.json({ success: true });
    }),
    http.delete(`${API}/api/push-tokens`, async ({ request }) => {
      calls.push('DELETE');
      bodies.push(await request.json());
      return HttpResponse.json({ success: true });
    }),
  );
  N.getPermissionsAsync.mockResolvedValue({
    status: 'undetermined',
    granted: false,
    canAskAgain: true,
  } as never);
  N.requestPermissionsAsync.mockResolvedValue({
    status: 'granted',
    granted: true,
    canAskAgain: true,
  } as never);
  N.getExpoPushTokenAsync.mockResolvedValue({ type: 'expo', data: TOKEN });
});

describe('pushPermission', () => {
  it.each([
    ['granted', true, 'granted'],
    ['denied', false, 'denied'],
    ['undetermined', false, 'undetermined'],
  ])('maps %s', async (status, granted, expected) => {
    N.getPermissionsAsync.mockResolvedValue({ status, granted, canAskAgain: true } as never);
    await expect(pushPermission()).resolves.toBe(expected);
  });

  it('is "unavailable" on an emulator or when the module fails', async () => {
    (Device as { isDevice: boolean }).isDevice = false;
    await expect(pushPermission()).resolves.toBe('unavailable');
    (Device as { isDevice: boolean }).isDevice = true;
    N.getPermissionsAsync.mockRejectedValue(new Error('x'));
    await expect(pushPermission()).resolves.toBe('unavailable');
  });
});

describe('enablePush', () => {
  it('asks permission, gets the token, registers it with the platform, and remembers it', async () => {
    await expect(enablePush()).resolves.toEqual({ ok: true });
    expect(N.requestPermissionsAsync).toHaveBeenCalled();
    expect(calls).toEqual(['POST']);
    expect(bodies[0]).toMatchObject({ token: TOKEN, platform: expect.stringMatching(/^(android|ios)$/) });
    expect(await secureStorage.getItem(PUSH_TOKEN_KEY)).toBe(TOKEN);
  });

  it('does not ask again when already allowed', async () => {
    N.getPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true, canAskAgain: true } as never);
    await enablePush();
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('stops when the user says no, and registers nothing', async () => {
    N.requestPermissionsAsync.mockResolvedValue({
      status: 'denied',
      granted: false,
      canAskAgain: false,
    } as never);
    await expect(enablePush()).resolves.toEqual({ ok: false, reason: 'denied' });
    expect(calls).toEqual([]);
  });

  it('says "unavailable" on an emulator', async () => {
    (Device as { isDevice: boolean }).isDevice = false;
    await expect(enablePush()).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });

  it('reports a failure (no Firebase file in the build, Expo down, server refuses) without throwing', async () => {
    N.getExpoPushTokenAsync.mockRejectedValue(new Error('Default FirebaseApp is not initialized'));
    await expect(enablePush()).resolves.toEqual({ ok: false, reason: 'failed' });
    N.getExpoPushTokenAsync.mockResolvedValue({ type: 'expo', data: TOKEN });
    server.use(http.post(`${API}/api/push-tokens`, () => HttpResponse.json({ error: 'x' }, { status: 500 })));
    await expect(enablePush()).resolves.toEqual({ ok: false, reason: 'failed' });
    expect(await secureStorage.getItem(PUSH_TOKEN_KEY)).toBeNull();
  });
});

describe('disablePush', () => {
  it('removes this phone from the server and forgets the token', async () => {
    await secureStorage.setItem(PUSH_TOKEN_KEY, TOKEN);
    await disablePush();
    expect(calls).toEqual(['DELETE']);
    expect(bodies[0]).toEqual({ token: TOKEN });
    expect(await secureStorage.getItem(PUSH_TOKEN_KEY)).toBeNull();
  });

  it('does nothing when there is no token, and never throws when the server is unreachable', async () => {
    await disablePush();
    expect(calls).toEqual([]);
    await secureStorage.setItem(PUSH_TOKEN_KEY, TOKEN);
    server.use(http.delete(`${API}/api/push-tokens`, () => HttpResponse.error()));
    await expect(disablePush()).resolves.toBeUndefined();
    expect(await secureStorage.getItem(PUSH_TOKEN_KEY)).toBeNull();
  });
});

describe('askPushAfterApply', () => {
  const press = (label: string) =>
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === label)?.onPress?.();
    });

  it('asks once, after the first application, and turns push on when the user agrees', async () => {
    const alert = press('Turn on');
    await askPushAfterApply();
    expect(alert).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['POST']);
    alert.mockClear();
    await askPushAfterApply();
    expect(alert).not.toHaveBeenCalled();
  });

  it('remembers "Not now" and does not ask again', async () => {
    const alert = press('Not now');
    await askPushAfterApply();
    expect(calls).toEqual([]);
    alert.mockClear();
    await askPushAfterApply();
    expect(alert).not.toHaveBeenCalled();
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('does not ask when the phone already decided or cannot do push', async () => {
    const alert = press('Turn on');
    N.getPermissionsAsync.mockResolvedValue({
      status: 'denied',
      granted: false,
      canAskAgain: false,
    } as never);
    await askPushAfterApply();
    N.getPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true, canAskAgain: true } as never);
    await askPushAfterApply();
    expect(alert).not.toHaveBeenCalled();
  });
});
