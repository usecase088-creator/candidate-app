import * as Sentry from '@sentry/react-native';

import { ApiError } from '@/api/errors';

// The native Sentry SDK is replaced at its boundary; we test our wrapper, not Sentry.
jest.mock('@sentry/react-native', () => ({ init: jest.fn(), captureException: jest.fn() }));

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
