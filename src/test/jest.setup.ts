import { server } from './msw/server';

// Restore Node's fetch & co. (see jestEnvironment.js) so MSW can intercept requests.
const nodeWebApis = (globalThis as unknown as { __NODE_WEB_APIS__: Record<string, unknown> })
  .__NODE_WEB_APIS__;
for (const [name, value] of Object.entries(nodeWebApis)) {
  Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
}

// Any request without a handler fails the test (PHASE-1 Task 3).
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
