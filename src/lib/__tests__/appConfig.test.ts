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
    expect(configFor({ APP_VARIANT: 'preview', PREVIEW_API_URL: undefined }).extra?.apiUrl).toBe(
      'http://localhost:3000',
    );
  });

  it('preview can point at a staging server later (PREVIEW_API_URL)', () => {
    expect(
      configFor({ APP_VARIANT: 'preview', PREVIEW_API_URL: 'https://staging.example.com' }).extra?.apiUrl,
    ).toBe('https://staging.example.com');
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
