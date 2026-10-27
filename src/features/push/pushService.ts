// Push notifications: ask permission, register this phone's Expo push token with the backend, forget it again.
// Permission is asked at a useful moment (after the first application, or from Settings), never on first launch.
// Every failure ends as a plain result: the app works the same without push.
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import { z } from 'zod';

import { api } from '@/api/client';
import { secureStorage } from '@/lib/secureStorage';

export const PUSH_TOKEN_KEY = 'push.token';
/** Set once the "turn on notifications?" question has been shown, so it is asked only once. */
export const PUSH_ASKED_KEY = 'push.asked';

const Ok = z.object({ success: z.boolean() }).loose();

export type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';
export type EnablePushResult = { ok: true } | { ok: false; reason: 'denied' | 'unavailable' | 'failed' };

export async function pushPermission(): Promise<PushPermission> {
  if (!Device.isDevice) return 'unavailable';
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted || p.status === 'granted') return 'granted';
    return p.status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'unavailable';
  }
}

export async function enablePush(): Promise<EnablePushResult> {
  if (!Device.isDevice) return { ok: false, reason: 'unavailable' };
  try {
    let permission = await pushPermission();
    if (permission === 'undetermined' || permission === 'denied') {
      const asked = await Notifications.requestPermissionsAsync();
      permission = asked.granted || asked.status === 'granted' ? 'granted' : 'denied';
    }
    if (permission !== 'granted') return { ok: false, reason: 'denied' };
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'ApronHanger',
        importance: AndroidImportance.DEFAULT,
      });
    }
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
      ?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await api.post('/api/push-tokens', { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' }, Ok);
    await secureStorage.setItem(PUSH_TOKEN_KEY, token);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/** Sign-out / account deletion: this phone stops getting this person's notifications. Best effort. */
export async function disablePush(): Promise<void> {
  try {
    const token = await secureStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) return;
    try {
      await api.deleteJson('/api/push-tokens', { token }, Ok);
    } finally {
      await secureStorage.deleteItem(PUSH_TOKEN_KEY);
    }
  } catch {
    // Offline or expired: the backend forgets a dead token by itself.
  }
}

/** After the first application: ask once whether to switch notifications on. */
export async function askPushAfterApply(): Promise<void> {
  try {
    if ((await secureStorage.getItem(PUSH_ASKED_KEY)) === '1') return;
    if ((await pushPermission()) !== 'undetermined') return;
    await secureStorage.setItem(PUSH_ASKED_KEY, '1');
    const yes = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Get updates on your application?',
        'Turn on notifications to hear when a recruiter responds, schedules an interview or sends an offer.',
        [
          { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Turn on', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    if (yes) await enablePush();
  } catch {
    // The question is a nicety: never get in the way of the application that just succeeded.
  }
}
