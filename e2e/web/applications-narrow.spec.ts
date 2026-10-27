import { expect, test } from '@playwright/test';

import {
  application,
  interview,
  mockApplications,
  offer,
  openApplication,
  openApplyChooser,
  profileMe,
} from './applicationsHelpers';
import { mockBackend, nurse, signIn } from './jobsHelpers';

// CLAUDE.md: layouts must work at 320 pt width. The apply chooser, My Applications, an application with its answer
// card and the CV upload form must not be wider than the screen. Font scale 2.0 is checked on the phone (SETUP.md).
test.use({ viewport: { width: 320, height: 640 } });

async function overflow(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll<HTMLElement>('[data-testid]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        // The tab row scrolls sideways on purpose.
        return r.width > 0 && r.right > width + 0.5 && !el.dataset.testid?.startsWith('applications.tab.');
      })
      .map((el) => el.dataset.testid);
    return { width, scrollWidth: document.documentElement.scrollWidth, offenders };
  });
}

test('Apply chooser, upload form, My Applications and answer cards fit 320 px', async ({
  page,
}, testInfo) => {
  await mockBackend(page, [nurse]);
  await mockApplications(page, { apps: [interview, offer, application({ id: 'a-applied' })], me: profileMe });
  await signIn(page);

  await openApplyChooser(page, 'n1');
  await expect(page.getByTestId('apply.quick')).toBeVisible();
  expect(await overflow(page)).toMatchObject({ offenders: [] });
  await page.screenshot({ path: testInfo.outputPath('apply-320.png'), fullPage: true });

  await page.getByTestId('apply.choice.upload').click();
  await expect(page.getByTestId('apply.upload.submit')).toBeVisible();
  expect(await overflow(page)).toMatchObject({ offenders: [] });
  await page.screenshot({ path: testInfo.outputPath('upload-320.png'), fullPage: true });

  await page.getByTestId('apply.upload.back').click();
  await page.getByTestId('apply.back').click();
  await page.getByTestId('job.back').click();
  await expect(page.getByTestId('home.screen')).toBeVisible();

  await page.getByTestId('tabs.applications').click();
  await expect(page.getByTestId('application.row.a-offer')).toBeVisible();
  expect(await overflow(page)).toMatchObject({ offenders: [] });
  await page.screenshot({ path: testInfo.outputPath('applications-320.png'), fullPage: true });

  await openApplication(page, 'a-interview');
  await expect(page.getByTestId('action.interview.accept')).toBeVisible();
  expect(await overflow(page)).toMatchObject({ offenders: [] });
  await page.screenshot({ path: testInfo.outputPath('interview-320.png'), fullPage: true });

  await page.getByTestId('application.back').click();
  await page.getByTestId('application.row.a-offer').click();
  await expect(page.getByTestId('action.offer.accept')).toBeVisible();
  expect(await overflow(page)).toMatchObject({ offenders: [] });
});
