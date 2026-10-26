import '@shopify/flash-list/jestSetup';
import { configure } from '@testing-library/react-native';

import { server } from './msw/server';

// Screen tests start the whole app; on a busy laptop the default 1 s for findBy*/waitFor is too tight.
configure({ asyncUtilTimeout: 4000 });

// The native manifest is empty in Jest. Give every test the development variant's `extra` (app.config.ts),
// pointing at the MSW base URL, so getEnv() and src/api/client.ts work as in the dev build.
jest.mock('expo-constants', () => {
  const actual = jest.requireActual('expo-constants');
  const constants = actual.default;
  return {
    ...actual,
    __esModule: true,
    default: {
      ...constants,
      expoConfig: {
        ...constants.expoConfig,
        version: '1.0.0',
        extra: {
          appVariant: 'development',
          apiUrl: 'http://localhost:3000',
          sentryEnvironment: 'development',
          sentryDsn: '',
        },
      },
    },
  };
});

// Restore Node's fetch & co. (see jestEnvironment.js) so MSW can intercept requests.
// Again in beforeAll: importing `expo` (e.g. through expo-router) in a test file installs expo/fetch
// after this setup file ran, which would bypass MSW.
function restoreNodeWebApis() {
  const nodeWebApis = (globalThis as unknown as { __NODE_WEB_APIS__: Record<string, unknown> })
    .__NODE_WEB_APIS__;
  for (const [name, value] of Object.entries(nodeWebApis)) {
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
  }
}
restoreNodeWebApis();

// Any request without a handler fails the test (PHASE-1 Task 3).
beforeAll(() => {
  restoreNodeWebApis();
  server.listen({ onUnhandledFrame: 'error' });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
