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
    expect(
      configFor({ APP_VARIANT: 'development', EAS_UPDATE_URL: 'https://u.expo.dev/x' }).updates,
    ).toMatchObject({
      enabled: false,
      checkAutomatically: 'NEVER',
    });
  });

  it('stays off in release variants until the EAS project exists (Task 10)', () => {
    expect(configFor({ APP_VARIANT: 'production', EAS_UPDATE_URL: undefined }).updates).toMatchObject({
      enabled: false,
    });
  });

  it('checks on launch in release variants once the update URL is set', () => {
    expect(
      configFor({ APP_VARIANT: 'production', EAS_UPDATE_URL: 'https://u.expo.dev/abc' }).updates,
    ).toMatchObject({ enabled: true, url: 'https://u.expo.dev/abc', checkAutomatically: 'ON_LOAD' });
  });
});

describe('plugins', () => {
  it('includes expo-secure-store (keeps tokens out of Android backups)', () => {
    expect(pluginNames(configFor({ APP_VARIANT: 'development' }))).toContain('expo-secure-store');
  });
});
