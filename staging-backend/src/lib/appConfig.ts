/**
 * Settings the mobile app reads at start: the lowest app version still allowed to run, per platform, and feature
 * flags. Values come from environment variables, so changing them needs no deploy of code and no database.
 *
 *   APP_MIN_VERSION_ANDROID / APP_MIN_VERSION_IOS   "major.minor.patch"; anything else is ignored (0.0.0 = nobody forced)
 *   APP_FLAGS                                       JSON object of name -> true/false
 *
 * A mistake in these values must never lock every user out, so bad input falls back to "no restriction".
 */
export type AppConfig = {
  minVersion: { android: string; ios: string };
  flags: Record<string, boolean>;
};

const VERSION = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
const FLAG_NAME = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;

function version(value: string | undefined): string {
  const v = (value ?? '').trim();
  return VERSION.test(v) ? v : '0.0.0';
}

function flags(value: string | undefined): Record<string, boolean> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, boolean> = {};
    for (const [name, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (FLAG_NAME.test(name) && typeof v === 'boolean') out[name] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function readAppConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  return {
    minVersion: {
      android: version(env.APP_MIN_VERSION_ANDROID),
      ios: version(env.APP_MIN_VERSION_IOS),
    },
    flags: flags(env.APP_FLAGS),
  };
}
