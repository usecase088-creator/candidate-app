import { expect, type Page, type Route } from '@playwright/test';

// Shared by the job web specs (PHASE-2 Task 10): fixtures and one stateful stand-in for the backend, mocked in the
// browser. The real backend is covered by tests/contract and the phone flows (e2e/maestro). Never calls production.
const API = 'http://localhost:3000';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

const candidate = {
  id: 'u1',
  email: 'candidate@apronhanger.test',
  name: 'Test Candidate',
  role: 'CANDIDATE',
  hospitalId: null,
  candidateId: 'c1',
};

export const job = (over: Record<string, unknown>) => ({
  id: 'j',
  role: 'Staff Nurse',
  category: 'Nurses',
  specialty: 'Nursing',
  location: 'Kolkata, West Bengal',
  city: 'Kolkata',
  salaryMin: 3,
  salaryMax: 4.5,
  experienceMin: 1,
  experienceMax: 5,
  type: 'Full-time',
  status: 'Active',
  postedDays: 0,
  description: 'Staff nurse for the medical ward.',
  tags: ['GNM'],
  responsibilities: ['Patient care'],
  requirements: [],
  perks: [],
  hospitalId: 'h1',
  hospital: 'Seed City Hospital',
  hospitalVerified: true,
  hospitalAbout: 'A test hospital.',
  applicants: 0,
  matchPercent: 80,
  ...over,
});

export const nurse = job({ id: 'n1' });
export const doctor = job({
  id: 'd1',
  role: 'Consultant Cardiologist',
  category: 'Doctors',
  specialty: 'Cardiology',
  city: 'Bengaluru',
  location: 'Bengaluru, Karnataka',
  type: 'Locum',
  salaryMax: 45,
  matchPercent: 60,
});

export type Backend = { saved: { savedAt: string; job: unknown }[]; failSave: boolean };

/** One stateful stand-in for the backend. Returns its state so tests can look at it. */
export async function mockBackend(page: Page, jobs: unknown[]): Promise<Backend> {
  const state: Backend = { saved: [], failSave: false };
  const json = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route(`${API}/api/**`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const url = new URL(req.url());
    const path = url.pathname;

    if (path === '/api/auth/login') return json(route, 200, { token: 'web-token', user: candidate });
    if (path === '/api/auth/me') return json(route, 200, { user: candidate });
    if (path === '/api/candidates/me') return json(route, 200, { id: 'c1', cvSource: null, profile: null });
    if (path === '/api/gov-jobs' || path === '/api/intl-jobs') return json(route, 200, []);
    if (path === '/api/jobs') return json(route, 200, jobs);
    if (path.startsWith('/api/jobs/')) {
      const found = (jobs as { id: string }[]).find((j) => j.id === path.split('/').pop());
      return found ? json(route, 200, found) : json(route, 404, { error: 'Job not found' });
    }
    if (path === '/api/saved-jobs' && req.method() === 'GET') return json(route, 200, state.saved);
    if (path === '/api/saved-jobs' && req.method() === 'POST') {
      if (state.failSave) return json(route, 500, { error: 'boom' });
      const { jobId } = req.postDataJSON() as { jobId: string };
      const saved = {
        savedAt: new Date().toISOString(),
        job: (jobs as { id: string }[]).find((j) => j.id === jobId),
      };
      state.saved.unshift(saved);
      return json(route, 201, saved);
    }
    if (path.startsWith('/api/saved-jobs/') && req.method() === 'DELETE') {
      const id = path.split('/').pop();
      state.saved = state.saved.filter((s) => (s.job as { id: string }).id !== id);
      return json(route, 200, { success: true });
    }
    return json(route, 404, { error: `unmocked ${req.method()} ${path}` });
  });
  return state;
}

export async function signIn(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('login.screen')).toBeVisible();
  await page.getByTestId('login.email').fill('candidate@apronhanger.test');
  await page.getByTestId('login.password').fill('Test@1234');
  await page.getByTestId('login.submit').click();
  await expect(page.getByTestId('home.screen')).toBeVisible({ timeout: 15_000 });
}
