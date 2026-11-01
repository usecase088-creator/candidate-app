import { expect, test } from '@playwright/test';

// Smoke: the web build starts and, with nothing signed in, opens Home as a guest; "Sign in" opens the login screen.
test('app starts on Home as a guest, and Sign in opens the login screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('home.screen')).toBeVisible();
  await expect(page.getByTestId('login.screen')).toHaveCount(0);
  await page.getByTestId('topbar.signin').click();
  await expect(page.getByTestId('login.screen')).toBeVisible();
  await expect(page.getByText('Welcome back')).toBeVisible();
});
