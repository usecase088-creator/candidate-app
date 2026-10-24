import { expect, test } from '@playwright/test';

// Smoke: the web build starts and renders the first screen.
// Becomes "sees the login screen" once Task 8 builds it.
test('app starts and shows the first screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('home.placeholder')).toBeVisible();
  await expect(page.getByText('ApronHanger')).toBeVisible();
});
