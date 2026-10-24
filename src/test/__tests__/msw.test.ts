import { http, HttpResponse } from 'msw';

import { server } from '../msw/server';

// Proves the network mock is wired into Jest. Real API tests go through src/api/client.ts (Task 5).
describe('MSW test server', () => {
  it('answers requests with the shared handlers', async () => {
    const res = await fetch('http://localhost:3000/health');
    expect(await res.json()).toEqual({ status: 'ok', db: 'ok' });
  });

  it('lets a test override a handler', async () => {
    server.use(
      http.get('http://localhost:3000/health', () => HttpResponse.json({ status: 'error' }, { status: 503 })),
    );
    const res = await fetch('http://localhost:3000/health');
    expect(res.status).toBe(503);
  });

  it('resets overrides between tests', async () => {
    const res = await fetch('http://localhost:3000/health');
    expect(res.status).toBe(200);
  });

  it('fails requests that no handler covers (MSW blocks them, they never reach the network)', async () => {
    await expect(fetch('http://localhost:3000/not-mocked')).rejects.toMatchObject({
      cause: { message: expect.stringContaining('[MSW] Cannot bypass a request') },
    });
  });
});
