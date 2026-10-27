// The only place in the app that calls fetch (CLAUDE.md), through createApiClient. PLAN.md §2 "API client".
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getEnv } from '@/lib/env';

import { createApiClient } from './createApiClient';
import { xhrUploadTransport } from './xhrUploadTransport';

export {
  type ApiClient,
  type ApiClientConfig,
  createApiClient,
  type RequestOptions,
  type UploadOptions,
} from './createApiClient';

/** The app's client. Base URL is read on first request, so a broken build config fails with getEnv's message. */
export const api = createApiClient({
  baseUrl: () => getEnv().apiUrl,
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
  platform: Platform.OS,
  uploadTransport: xhrUploadTransport,
});
