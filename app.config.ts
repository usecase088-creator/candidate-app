import type { ConfigContext, ExpoConfig } from 'expo/config';

import withWindowsCmake from './plugins/withWindowsCmake.ts';

// One build-time switch: APP_VARIANT = development | preview | production (PLAN.md §3).
// Values that differ per variant live here; src/lib/env.ts validates what reaches the app.
type Variant = 'development' | 'preview' | 'production';

const BUNDLE_ID = 'work.apronhanger.candidate'; // D2 — permanent once published
/** EAS project (eas init 2026-10-25, organization apronhanger-candidate). Public id, not a secret. */
const EAS_PROJECT_ID = '3bb496c0-6a80-4efe-a672-ccb36ba6fbd9';
const PRODUCTION_API_URL = 'https://job-ojsr.onrender.com'; // live backend used by apronhanger.work

const VARIANTS: Record<Variant, { name: string; idSuffix: string; scheme: string; apiUrl: string }> = {
  development: {
    name: 'ApronHanger (Dev)',
    idSuffix: '.dev',
    scheme: 'apronhanger-dev',
    // Local reference backend (Task 4); reached from the phone through `adb reverse tcp:3000 tcp:3000`.
    apiUrl: 'http://localhost:3000',
  },
  preview: {
    name: 'ApronHanger (Preview)',
    idSuffix: '.preview',
    scheme: 'apronhanger-preview',
    apiUrl: PRODUCTION_API_URL,
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
    },
    web: {
      output: 'single',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      // Keeps SecureStore data out of Android auto-backup (a restored backup can't decrypt it anyway).
      'expo-secure-store',
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
      apiUrl: process.env.API_URL_OVERRIDE ?? v.apiUrl,
      sentryEnvironment: variant,
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    },
  });
};
