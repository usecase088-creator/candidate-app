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

describe('plugins', () => {
  it('includes expo-secure-store (keeps tokens out of Android backups)', () => {
    expect(pluginNames(configFor({ APP_VARIANT: 'development' }))).toContain('expo-secure-store');
  });
});
