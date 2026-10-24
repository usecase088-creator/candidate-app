// Smoke: the local reference backend is up and its database answers.
const BASE_URL = process.env.CONTRACT_API_URL ?? 'http://localhost:3000';

if (/onrender\.com|apronhanger\.work/.test(BASE_URL)) {
  throw new Error('Contract tests must never run against production (CLAUDE.md: Safety).');
}

test('GET /health reports the API and database as ok', async () => {
  const res = await fetch(`${BASE_URL}/health`);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: 'ok', db: 'ok' });
});
