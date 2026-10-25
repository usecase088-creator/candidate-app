import { expect, test } from '@playwright/test';

// PHASE-1 Task 6 / CLAUDE.md: layouts must work at 320 pt width. Every base component is on /dev-ui
// (development builds only). Fails if anything is wider than the screen; saves a screenshot to look at.
test.use({ viewport: { width: 320, height: 640 } });

test('base components fit a 320 px wide screen', async ({ page }, testInfo) => {
  await page.goto('/dev-ui');
  await expect(page.getByTestId('dev.ui')).toBeVisible();
  await expect(page.getByText('Welcome back')).toBeVisible();

  // The scroll content must not be wider than the viewport, and no element may stick out to the right.
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll<HTMLElement>('[data-testid]')]
      .filter((el) => el.getBoundingClientRect().right > width + 0.5)
      .map((el) => el.dataset.testid);
    return { width, scrollWidth: document.documentElement.scrollWidth, offenders };
  });
  expect(overflow.offenders).toEqual([]);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width);

  await page.screenshot({ path: testInfo.outputPath('dev-ui-320.png'), fullPage: true });
});
