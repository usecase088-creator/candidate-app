import type { ExpoConfig } from 'expo/config';

import makeConfig from '../../../app.config';

function configFor(env: Record<string, string | undefined>): ExpoConfig {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k];
  try {
    return makeConfig({ config: {} } as Parameters<typeof makeConfig>[0]);
  } finally {
    process.env = saved;
  }
}

const pluginNames = (c: ExpoConfig) => (c.plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p));

describe('expo-updates', () => {
  it.each(['development', 'preview', 'production'])('%s uses the fingerprint runtime version', (variant) => {
    expect(configFor({ APP_VARIANT: variant }).runtimeVersion).toEqual({ policy: 'fingerprint' });
  });

  it('never checks for updates in development', () => {
    expect(configFor({ APP_VARIANT: 'development' }).updates).toMatchObject({
      enabled: false,
      checkAutomatically: 'NEVER',
    });
  });

  it.each(['preview', 'production'])('%s checks on launch, from the EAS project update URL', (variant) => {
    expect(configFor({ APP_VARIANT: variant }).updates).toMatchObject({
      enabled: true,
      url: 'https://u.expo.dev/3bb496c0-6a80-4efe-a672-ccb36ba6fbd9',
      checkAutomatically: 'ON_LOAD',
    });
  });
});

describe('EAS project', () => {
  it('belongs to the client organization (D7), with the project id from eas init', () => {
    const config = configFor({ APP_VARIANT: 'production' });
    expect(config.owner).toBe('apronhanger-candidate');
    expect(config.extra?.eas).toEqual({ projectId: '3bb496c0-6a80-4efe-a672-ccb36ba6fbd9' });
  });
});

describe('which backend each build talks to (D20)', () => {
  const LIVE = /onrender.com|apronhanger.work/;

  it('only the production build uses the live server', () => {
    expect(configFor({ APP_VARIANT: 'production' }).extra?.apiUrl).toBe('https://job-ojsr.onrender.com');
    expect(configFor({ APP_VARIANT: 'development' }).extra?.apiUrl).toBe('http://localhost:3000');
  });

  it('the preview build talks to the staging server by default (D24), never to localhost and never to the live server', () => {
    const url = configFor({ APP_VARIANT: 'preview', PREVIEW_API_URL: undefined, API_URL_OVERRIDE: undefined })
      .extra?.apiUrl;
    expect(url).toBe('https://apronhanger-staging-api.onrender.com');
    expect(url).not.toMatch(/localhost/);
    expect(url).not.toMatch(/job-ojsr\.onrender\.com|apronhanger\.work/);
  });

  it('preview can point at a staging server later (PREVIEW_API_URL)', () => {
    expect(
      configFor({ APP_VARIANT: 'preview', PREVIEW_API_URL: 'https://staging.example.com' }).extra?.apiUrl,
    ).toBe('https://staging.example.com');
  });

  it('allows the staging server on Render (a different host from the live one)', () => {
    const url = 'https://apronhanger-staging-api.onrender.com';
    expect(configFor({ APP_VARIANT: 'development', API_URL_OVERRIDE: url }).extra?.apiUrl).toBe(url);
    expect(configFor({ APP_VARIANT: 'preview', PREVIEW_API_URL: url }).extra?.apiUrl).toBe(url);
  });

  it.each([
    ['preview', { PREVIEW_API_URL: 'https://job-ojsr.onrender.com' }],
    ['preview', { API_URL_OVERRIDE: 'https://job-ojsr.onrender.com' }],
    ['development', { API_URL_OVERRIDE: 'https://apronhanger.work' }],
  ])('refuses to build %s against the live server (%o)', (variant, env) => {
    expect(() => configFor({ APP_VARIANT: variant, ...env })).toThrow(/live server/);
  });

  it('allows plain http to the test backend on Android, except in production', () => {
    const cleartext = (variant: string) => {
      const plugin = (configFor({ APP_VARIANT: variant }).plugins ?? []).find(
        (p) => Array.isArray(p) && p[0] === 'expo-build-properties',
      ) as [string, { android?: { usesCleartextTraffic?: boolean } }] | undefined;
      return plugin?.[1].android?.usesCleartextTraffic;
    };
    expect(cleartext('development')).toBe(true);
    expect(cleartext('preview')).toBe(true);
    expect(cleartext('production')).toBe(false);
    expect(configFor({ APP_VARIANT: 'production' }).extra?.apiUrl).toMatch(LIVE);
  });
});

describe('App Store', () => {
  it('declares that the app uses only exempt encryption (HTTPS), so TestFlight needs no extra paperwork', () => {
    expect(configFor({ APP_VARIANT: 'production' }).ios?.infoPlist).toMatchObject({
      ITSAppUsesNonExemptEncryption: false,
    });
  });
});

describe('plugins', () => {
  it('includes expo-secure-store (keeps tokens out of Android backups)', () => {
    expect(pluginNames(configFor({ APP_VARIANT: 'development' }))).toContain('expo-secure-store');
  });
});

describe('permissions (Phase 3, D26): only camera and photo access, with reason texts', () => {
  const imagePicker = (c: ExpoConfig) =>
    (c.plugins ?? []).find((p) => Array.isArray(p) && p[0] === 'expo-image-picker') as
      [string, Record<string, unknown>] | undefined;

  it.each(['development', 'preview', 'production'])(
    '%s: image picker has camera and photo reasons and no microphone',
    (variant) => {
      const options = imagePicker(configFor({ APP_VARIANT: variant }))?.[1];
      expect(options).toBeDefined();
      expect(typeof options?.cameraPermission).toBe('string');
      expect(String(options?.cameraPermission).length).toBeGreaterThan(20);
      expect(typeof options?.photosPermission).toBe('string');
      expect(String(options?.photosPermission).length).toBeGreaterThan(20);
      expect(options?.microphonePermission).toBe(false);
    },
  );

  it('blocks the microphone and the broad storage permissions that libraries add on their own', () => {
    expect(configFor({ APP_VARIANT: 'production' }).android?.blockedPermissions).toEqual(
      expect.arrayContaining([
        'android.permission.RECORD_AUDIO',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO',
        'android.permission.READ_MEDIA_AUDIO',
      ]),
    );
  });
});

describe('permissions: no Face ID text (the app does not use biometrics)', () => {
  it('turns off the Face ID usage text that expo-secure-store adds by default', () => {
    const secureStore = (configFor({ APP_VARIANT: 'production' }).plugins ?? []).find(
      (p) => Array.isArray(p) && p[0] === 'expo-secure-store',
    ) as [string, Record<string, unknown>] | undefined;
    expect(secureStore?.[1]).toMatchObject({ faceIDPermission: false });
  });
});

describe('permissions: no biometrics, no screen overlay in store builds', () => {
  const blocked = (variant: string) => configFor({ APP_VARIANT: variant }).android?.blockedPermissions ?? [];

  it.each(['development', 'preview', 'production'])(
    '%s blocks the biometric permissions secure-store pulls in',
    (variant) => {
      expect(blocked(variant)).toEqual(
        expect.arrayContaining(['android.permission.USE_BIOMETRIC', 'android.permission.USE_FINGERPRINT']),
      );
    },
  );

  it.each(['preview', 'production'])(
    '%s blocks SYSTEM_ALERT_WINDOW (only the developer menu needs it)',
    (variant) => {
      expect(blocked(variant)).toContain('android.permission.SYSTEM_ALERT_WINDOW');
    },
  );

  it('development keeps it (developer menu overlay)', () => {
    expect(blocked('development')).not.toContain('android.permission.SYSTEM_ALERT_WINDOW');
  });
});
