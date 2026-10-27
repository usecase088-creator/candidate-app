import * as Sentry from '@sentry/react-native';

import { ApiError } from '@/api/errors';

// The native Sentry SDK is replaced at its boundary; we test our wrapper, not Sentry.
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

const DSN = 'https://public@o1.ingest.sentry.io/2';

function load(): typeof import('../sentry') {
  let mod: typeof import('../sentry') | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../sentry');
  });
  return mod!;
}

beforeEach(() => jest.clearAllMocks());

describe('initSentry', () => {
  it('does nothing without a DSN', () => {
    expect(load().initSentry({ sentryEnvironment: 'development' }, { isTest: false })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('does nothing in tests, even with a DSN', () => {
    expect(load().initSentry({ sentryDsn: DSN, sentryEnvironment: 'development' })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('starts Sentry without default PII, screenshots or view hierarchy', () => {
    expect(load().initSentry({ sentryDsn: DSN, sentryEnvironment: 'preview' }, { isTest: false })).toBe(true);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: DSN,
        environment: 'preview',
        sendDefaultPii: false,
        attachScreenshot: false,
        attachViewHierarchy: false,
      }),
    );
  });

  it('scrubs every event and breadcrumb before sending', () => {
    load().initSentry({ sentryDsn: DSN, sentryEnvironment: 'preview' }, { isTest: false });
    const options = jest.mocked(Sentry.init).mock.calls[0][0]!;
    const event = options.beforeSend!({ type: undefined, message: 'for asha@x.com' }, {});
    expect(event).toMatchObject({ message: 'for [email]' });
    expect(options.beforeBreadcrumb!({ category: 'ui.input', message: 'x' }, {})).toBeNull();
  });
});

describe('reportApiError', () => {
  const parseError = ApiError.parse(200, '/api/auth/me', ['user.email: Invalid input']);

  it('is a no-op until Sentry is started', () => {
    load().reportApiError(parseError);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('sends the error with kind, status, path and issues only', () => {
    const sentry = load();
    sentry.initSentry({ sentryDsn: DSN, sentryEnvironment: 'preview' }, { isTest: false });
    sentry.reportApiError(parseError);
    expect(Sentry.captureException).toHaveBeenCalledWith(parseError, {
      tags: { api_error_kind: 'parse' },
      extra: { status: 200, path: '/api/auth/me', issues: ['user.email: Invalid input'] },
    });
  });
});

describe('sendInstallCheckEvent (preview builds only: proves Sentry works on a real phone)', () => {
  const memory = () => {
    const data = new Map<string, string>();
    return {
      data,
      getItem: async (k: string) => data.get(k) ?? null,
      setItem: async (k: string, v: string) => void data.set(k, v),
      deleteItem: async (k: string) => void data.delete(k),
    };
  };

  it('sends one info event the first time, and remembers it', async () => {
    const sentry = load();
    sentry.initSentry({ sentryDsn: DSN, sentryEnvironment: 'preview' }, { isTest: false });
    const storage = memory();
    await expect(sentry.sendInstallCheckEvent(storage)).resolves.toBe(true);
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('Install check'),
      expect.objectContaining({ level: 'info', tags: { purpose: 'install-check' } }),
    );
    expect(storage.data.get(sentry.INSTALL_CHECK_KEY)).toBe('1');
  });

  it('never a second time on the same install', async () => {
    const sentry = load();
    sentry.initSentry({ sentryDsn: DSN, sentryEnvironment: 'preview' }, { isTest: false });
    const storage = memory();
    await sentry.sendInstallCheckEvent(storage);
    await expect(sentry.sendInstallCheckEvent(storage)).resolves.toBe(false);
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
  });

  it.each(['development', 'production'])('never in %s builds', async (environment) => {
    const sentry = load();
    sentry.initSentry({ sentryDsn: DSN, sentryEnvironment: environment as 'development' }, { isTest: false });
    await expect(sentry.sendInstallCheckEvent(memory())).resolves.toBe(false);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('never when Sentry is off (no DSN, or tests)', async () => {
    const sentry = load();
    sentry.initSentry({ sentryEnvironment: 'preview' }, { isTest: false });
    await expect(sentry.sendInstallCheckEvent(memory())).resolves.toBe(false);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('carries a fake email and phone number as a probe, and the scrubber turns them into [email] and [phone]', async () => {
    const sentry = load();
    sentry.initSentry({ sentryDsn: DSN, sentryEnvironment: 'preview' }, { isTest: false });
    await sentry.sendInstallCheckEvent(memory());
    const message = jest.mocked(Sentry.captureMessage).mock.calls[0]![0];
    expect(message).toMatch(/probe\.person@example\.test/);
    expect(message).toMatch(/9876543210/);
    const options = jest.mocked(Sentry.init).mock.calls[0]![0]!;
    const sent = await options.beforeSend!({ type: undefined, message }, {});
    expect(sent?.message).toContain('[email]');
    expect(sent?.message).toContain('[phone]');
    expect(sent?.message).not.toMatch(/example\.test|9876543210/);
  });

  it('a storage failure never breaks the app: nothing is sent and false is returned', async () => {
    const sentry = load();
    sentry.initSentry({ sentryDsn: DSN, sentryEnvironment: 'preview' }, { isTest: false });
    const broken = {
      getItem: async () => {
        throw new Error('store');
      },
      setItem: async () => undefined,
      deleteItem: async () => undefined,
    };
    await expect(sentry.sendInstallCheckEvent(broken)).resolves.toBe(false);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });
});
