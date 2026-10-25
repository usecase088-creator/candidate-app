// Does production still answer in the shape the app expects? Public, read-only endpoints only.
import { createApiClient } from '@/api/createApiClient';
import { GovJobListSchema, IntlJobListSchema, JobListSchema } from '@/api/schemas/jobs';

// Same URL as app.config.ts PRODUCTION_API_URL.
const PRODUCTION_API_URL = 'https://job-ojsr.onrender.com';

// Never send a token: the client starts signed out and nothing here signs in. GET only.
const api = createApiClient({
  baseUrl: PRODUCTION_API_URL,
  appVersion: 'drift-check',
  platform: 'node',
  timeoutMs: 60_000,
});

it('GET /api/jobs parses with JobListSchema', async () => {
  const jobs = await api.get('/api/jobs', JobListSchema);
  console.log(`[drift-check] /api/jobs: ${jobs.length} jobs`);
});

it('GET /api/gov-jobs parses with GovJobListSchema', async () => {
  const jobs = await api.get('/api/gov-jobs', GovJobListSchema);
  console.log(`[drift-check] /api/gov-jobs: ${jobs.length} jobs`);
});

it('GET /api/intl-jobs parses with IntlJobListSchema', async () => {
  const jobs = await api.get('/api/intl-jobs', IntlJobListSchema);
  console.log(`[drift-check] /api/intl-jobs: ${jobs.length} jobs`);
});
