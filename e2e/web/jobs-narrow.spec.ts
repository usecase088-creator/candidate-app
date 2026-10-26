import { expect, test } from '@playwright/test';

import { doctor, mockBackend, nurse, signIn } from './jobsHelpers';

// CLAUDE.md: layouts must work at 320 pt width. Home, Search, the filter sheet and a job's details must not be wider
// than the screen. The font-scale 2.0 check is done on the phone (SETUP.md) because the browser has no font scale.
test.use({ viewport: { width: 320, height: 640 } });

async function overflow(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll<HTMLElement>('[data-testid]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        // Horizontal rails (categories, recommended) scroll on purpose: only judge elements that are not inside one.
        return (
          r.width > 0 &&
          r.right > width + 0.5 &&
          !el.closest('[data-testid="categories.rail"], [data-testid="recommended.rail"]')
        );
      })
      .map((el) => el.dataset.testid);
    return { width, scrollWidth: document.documentElement.scrollWidth, offenders };
  });
}

test('Home, Search, filters and job details fit 320 px', async ({ page }, testInfo) => {
  await mockBackend(page, [nurse, doctor]);
  await signIn(page);
  await expect(page.getByTestId('job.card.n1')).toBeVisible();
  expect(await overflow(page)).toMatchObject({ offenders: [] });
  await page.screenshot({ path: testInfo.outputPath('home-320.png'), fullPage: true });

  await page.getByTestId('tabs.search').click();
  await expect(page.getByTestId('search.screen')).toBeVisible();
  expect(await overflow(page)).toMatchObject({ offenders: [] });

  await page.getByTestId('search.filters').click();
  await expect(page.getByTestId('filters.sheet')).toBeVisible();
  expect(await overflow(page)).toMatchObject({ offenders: [] });
  await page.screenshot({ path: testInfo.outputPath('filters-320.png') });
  await page.getByTestId('filters.close').click();

  await page.getByTestId('tabs.home').click();
  await page.getByTestId('home.list').getByTestId('job.open.n1').click();
  await expect(page.getByTestId('job.screen')).toBeVisible();
  expect(await overflow(page)).toMatchObject({ offenders: [] });
  await page.screenshot({ path: testInfo.outputPath('details-320.png'), fullPage: true });
});
