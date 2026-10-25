import { expect, test } from '@playwright/test';

// Smoke: the web build starts and, signed out, shows the login screen.
test('app starts on the login screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('login.screen')).toBeVisible();
  await expect(page.getByText('Welcome back')).toBeVisible();
});
