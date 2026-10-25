import { expect, type Page, test } from '@playwright/test';

// Quick web checks of the sign-in screen (PHASE-1 Task 9). The API is mocked in the browser; the real backend is
// covered by tests/contract and the phone flows (e2e/maestro). Never calls production.
const API = 'http://localhost:3000';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const candidate = {
  id: 'u1',
  email: 'candidate@apronhanger.test',
  name: 'Test Candidate',
  role: 'CANDIDATE',
  hospitalId: null,
  candidateId: 'c1',
};

/** Answers one API path (and its CORS preflight) with a JSON body; returns the bodies the app sent. */
async function mockApi(page: Page, path: string, status: number, body: unknown) {
  const sent: unknown[] = [];
  await page.route(`${API}${path}`, async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    sent.push(route.request().postDataJSON());
    return route.fulfill({
      status,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  return sent;
}

async function openLogin(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('login.screen')).toBeVisible();
}

async function fillAndSubmit(page: Page, email: string, password: string) {
  await page.getByTestId('login.email').fill(email);
  await page.getByTestId('login.password').fill(password);
  await page.getByTestId('login.submit').click();
}

test('signs in and opens Home', async ({ page }) => {
  const sent = await mockApi(page, '/api/auth/login', 200, { token: 'web-token', user: candidate });
  await mockApi(page, '/api/auth/me', 200, { user: candidate });
  await openLogin(page);
  await fillAndSubmit(page, 'candidate@apronhanger.test', 'Test@1234');

  await expect(page.getByText('Welcome back!')).toBeVisible();
  await expect(page.getByTestId('home.screen')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Hi, Test Candidate')).toBeVisible();
  expect(sent[0]).toEqual({ email: 'candidate@apronhanger.test', password: 'Test@1234' });
});

test('shows the website validation messages without calling the API', async ({ page }) => {
  let called = false;
  await page.route(`${API}/api/**`, (route) => {
    called = true;
    return route.abort();
  });
  await openLogin(page);
  await fillAndSubmit(page, 'asha@', '');

  await expect(page.getByTestId('login.email.error')).toHaveText('Enter a valid email');
  await expect(page.getByTestId('login.password.error')).toHaveText('Password is required');
  await expect(page.getByTestId('login.error')).toHaveText('Enter a valid email');
  expect(called).toBe(false);
});

test('rejects a recruiter account with the website message', async ({ page }) => {
  await mockApi(page, '/api/auth/login', 200, {
    token: 'rec-token',
    user: { ...candidate, role: 'RECRUITER', candidateId: null },
  });
  await openLogin(page);
  await fillAndSubmit(page, 'recruiter@apronhanger.test', 'Test@1234');

  await expect(page.getByTestId('login.error')).toHaveText(
    'This email is registered as a recruiter account. Please sign in on the Recruiter Portal instead.',
  );
  await expect(page.getByTestId('login.screen')).toBeVisible();
  await expect(page.getByTestId('home.screen')).toHaveCount(0);
});

test('shows the backend message for a wrong password', async ({ page }) => {
  await mockApi(page, '/api/auth/login', 401, { error: 'Invalid email or password' });
  await openLogin(page);
  await fillAndSubmit(page, 'candidate@apronhanger.test', 'wrong');
  await expect(page.getByTestId('login.error')).toHaveText('Invalid email or password. Please try again.');
});
