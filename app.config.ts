import type { ConfigContext, ExpoConfig } from 'expo/config';

import withWindowsCmake from './plugins/withWindowsCmake.ts';

// One build-time switch: APP_VARIANT = development | preview | production (PLAN.md §3).
// Values that differ per variant live here; src/lib/env.ts validates what reaches the app.
type Variant = 'development' | 'preview' | 'production';

const BUNDLE_ID = 'work.apronhanger.candidate'; // D2 — permanent once published
/** EAS project (eas init 2026-10-25, organization apronhanger-candidate). Public id, not a secret. */
const EAS_PROJECT_ID = '3bb496c0-6a80-4efe-a672-ccb36ba6fbd9';
const PRODUCTION_API_URL = 'https://job-ojsr.onrender.com'; // live backend used by apronhanger.work
/** Local reference backend (Task 4): the dev database, reached from the phone through `adb reverse tcp:3000 tcp:3000`. */
const LOCAL_API_URL = 'http://localhost:3000';
/** The staging server (D24): Raj's own Render workspace, shares the development database. Test data only. */
const STAGING_API_URL = 'https://apronhanger-staging-api.onrender.com';
/** D20: only the production (store) build may talk to the live server. */
// Only the real production host: the staging server (D4) is also on onrender.com but is a test backend.
const LIVE_SERVER = /job-ojsr.onrender.com|apronhanger.work/;

const VARIANTS: Record<Variant, { name: string; idSuffix: string; scheme: string; apiUrl: string }> = {
  development: {
    name: 'ApronHanger (Dev)',
    idSuffix: '.dev',
    scheme: 'apronhanger-dev',
    apiUrl: LOCAL_API_URL,
  },
  preview: {
    name: 'ApronHanger (Preview)',
    idSuffix: '.preview',
    scheme: 'apronhanger-preview',
    // D20: never the live server. Preview builds go on real phones, where localhost does not exist: the staging server
    // (D24). PREVIEW_API_URL or API_URL_OVERRIDE can point somewhere else (never the live server).
    apiUrl: STAGING_API_URL,
  },
  production: { name: 'ApronHanger', idSuffix: '', scheme: 'apronhanger', apiUrl: PRODUCTION_API_URL },
};

function readVariant(): Variant {
  const raw = process.env.APP_VARIANT ?? 'development';
  if (raw === 'development' || raw === 'preview' || raw === 'production') return raw;
  throw new Error(`APP_VARIANT must be development, preview or production (got "${raw}")`);
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = readVariant();
  const v = VARIANTS[variant];
  const bundleId = `${BUNDLE_ID}${v.idSuffix}`;
  const variantUrl = variant === 'preview' ? (process.env.PREVIEW_API_URL ?? v.apiUrl) : v.apiUrl;
  const apiUrl = process.env.API_URL_OVERRIDE ?? variantUrl;
  if (variant !== 'production' && LIVE_SERVER.test(apiUrl)) {
    throw new Error(
      `D20: the ${variant} build must not use the live server (${apiUrl}). Only production may.`,
    );
  }
  // OTA updates (PLAN.md §2) from the EAS project. Never in development: Metro serves the JS there.
  // Publishing a production update still needs Raj's OK (CLAUDE.md).
  const updateUrl = `https://u.expo.dev/${EAS_PROJECT_ID}`;
  const updatesOn = variant !== 'development';

  // withWindowsCmake: long-path-safe CMake for Android builds on Windows (docs/SETUP.md).
  return withWindowsCmake({
    ...config,
    name: v.name,
    // EAS project lives in the client's Expo organization (D7).
    owner: 'apronhanger-candidate',
    slug: 'apronhanger-candidate',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: v.scheme,
    // D11: website light theme only; the app stays light when the phone is in dark mode.
    userInterfaceStyle: 'light',
    // A new native fingerprint means a new runtime: OTA updates only reach binaries they are compatible with.
    runtimeVersion: { policy: 'fingerprint' },
    updates: {
      enabled: updatesOn,
      ...(updatesOn ? { url: updateUrl } : {}),
      checkAutomatically: updatesOn ? 'ON_LOAD' : 'NEVER',
      fallbackToCacheTimeout: 0,
    },
    ios: {
      bundleIdentifier: bundleId,
      // Only standard HTTPS/TLS: exempt from US export rules, so App Store Connect asks no encryption questions.
      infoPlist: { ITSAppUsesNonExemptEncryption: false },
      icon: './assets/expo.icon',
    },
    android: {
      package: bundleId,
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      // Phase 3 (D26): only camera and photo access. Libraries add storage permissions and the image picker the
      // microphone on their own; blocking them keeps the merged manifest to what the app really uses
      // (the system photo picker and document picker need no storage permission).
      blockedPermissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO',
        'android.permission.READ_MEDIA_AUDIO',
        // expo-secure-store pulls these in; the app uses no biometrics.
        'android.permission.USE_BIOMETRIC',
        'android.permission.USE_FINGERPRINT',
        // Expo's template adds the screen overlay for the developer menu; store and test builds don't need it.
        ...(variant === 'development' ? [] : ['android.permission.SYSTEM_ALERT_WINDOW']),
      ],
    },
    web: {
      output: 'single',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      // Keeps SecureStore data out of Android auto-backup (a restored backup can't decrypt it anyway).
      // faceIDPermission false: the app uses no biometrics, so the iPhone gets no Face ID usage text.
      ['expo-secure-store', { faceIDPermission: false }],
      // Release builds block plain http. Development and preview talk to the http test backend (D20);
      // the store build stays https-only.
      ['expo-build-properties', { android: { usesCleartextTraffic: variant !== 'production' } }],
      [
        'expo-image-picker',
        {
          cameraPermission:
            'ApronHanger uses the camera so you can take a photo of a document to upload with your application.',
          photosPermission:
            'ApronHanger uses your photos only when you choose a picture of a document to upload with your application.',
          microphonePermission: false,
        },
      ],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#208AEF',
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      eas: { projectId: EAS_PROJECT_ID },
      appVariant: variant,
      apiUrl,
      sentryEnvironment: variant,
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    },
  });
};
