import { parseEnv } from '../env';

const valid = {
  appVariant: 'development',
  apiUrl: 'http://localhost:3000',
  sentryEnvironment: 'development',
};

describe('parseEnv', () => {
  it('accepts a valid development config', () => {
    expect(parseEnv(valid)).toEqual({ ...valid, sentryDsn: undefined });
  });

  it('accepts an https production config with a Sentry DSN', () => {
    const prod = {
      appVariant: 'production',
      apiUrl: 'https://job-ojsr.onrender.com',
      sentryEnvironment: 'production',
      sentryDsn: 'https://abc@o1.ingest.sentry.io/2',
    };
    expect(parseEnv(prod)).toEqual(prod);
  });

  it('treats an empty Sentry DSN as not set', () => {
    expect(parseEnv({ ...valid, sentryDsn: '' }).sentryDsn).toBeUndefined();
  });

  it('throws a clear message when the config is missing', () => {
    expect(() => parseEnv(undefined)).toThrow(/Invalid app config/);
  });

  it('names the missing field', () => {
    const { apiUrl: _omit, ...rest } = valid;
    expect(() => parseEnv(rest)).toThrow(/apiUrl/);
  });

  it('rejects an unknown variant', () => {
    expect(() => parseEnv({ ...valid, appVariant: 'staging' })).toThrow(/appVariant/);
  });

  it('rejects an API URL that is not a URL', () => {
    expect(() => parseEnv({ ...valid, apiUrl: 'localhost' })).toThrow(/apiUrl/);
  });

  it('rejects plain http outside development', () => {
    expect(() =>
      parseEnv({ ...valid, appVariant: 'preview', apiUrl: 'http://job-ojsr.onrender.com' }),
    ).toThrow(/https/);
  });
});
