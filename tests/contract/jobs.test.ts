// Public job lists parse with the app's schemas (PHASE-1 Task 9). Local backend only.
import { GovJobListSchema, IntlJobListSchema, JobListSchema } from '@/api/schemas/jobs';

import { contractClient } from './backend';

const api = contractClient();

it('GET /api/jobs is a bare array that parses, with the 4 seeded jobs', async () => {
  const jobs = await api.get('/api/jobs', JobListSchema);
  const ids = jobs.map((j) => j.id);
  for (const id of ['b001', 'b002', 'b003', 'b004']) {
    expect(ids).toContain(`5eed0000-0000-4000-8000-00000000${id}`);
  }
});

it('GET /api/gov-jobs parses', async () => {
  await expect(api.get('/api/gov-jobs', GovJobListSchema)).resolves.toEqual(expect.any(Array));
});

it('GET /api/intl-jobs parses', async () => {
  await expect(api.get('/api/intl-jobs', IntlJobListSchema)).resolves.toEqual(expect.any(Array));
});
