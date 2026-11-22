import { type Page, test } from '@playwright/test';

import { application, interview, mockApplications, offer, profileMe } from './applicationsHelpers';
import { doctor, mockBackend, nurse, signIn } from './jobsHelpers';

// LOCAL ONLY (not committed): screenshots of every redesigned screen for the D32 visual review. In-app navigation only:
// a page reload drops the web session.
const OUT = process.env.SHOTS_DIR ?? 'shots';
if (process.env.NARROW) test.use({ viewport: { width: 320, height: 640 } });
const shot = async (page: Page, name: string) => {
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${test.info().project.name}-${name}.png`, fullPage: false });
};
const back = (page: Page) => page.goBack();
const tap = (page: Page, id: string) => page.getByTestId(id).first().click();

test('visual tour', async ({ page }) => {
  test.setTimeout(300_000);
  await mockBackend(page, [nurse, doctor]);
  await mockApplications(page, { apps: [interview, offer, application({ id: 'a-applied' })], me: profileMe });
  await signIn(page);
  await page.waitForTimeout(4500); // let the welcome toast leave

  await shot(page, '04-home');
  await tap(page, 'home.link.gov');
  await page.getByTestId('gov.screen').waitFor();
  await shot(page, '09-gov');
  await back(page);
  await tap(page, 'home.link.intl');
  await page.getByTestId('intl.screen').waitFor();
  await shot(page, '10-intl');
  await back(page);
  await tap(page, 'home.link.saved');
  await page.getByTestId('saved.screen').waitFor();
  await shot(page, '11-saved');
  await back(page);

  await tap(page, 'tabs.search');
  await page.getByTestId('search.screen').waitFor();
  await shot(page, '07-search');
  await tap(page, 'search.filters');
  await page.getByTestId('filters.sheet').waitFor();
  await shot(page, '08-filters');
  await tap(page, 'filters.close');

  await tap(page, 'tabs.home');
  await tap(page, 'job.open.n1');
  await page.getByTestId('job.screen').waitFor();
  await tap(page, 'job.apply');
  await page.getByTestId('apply.screen').waitFor();
  await shot(page, '12-apply-chooser');
  await page.mouse.wheel(0, 1200);
  await shot(page, '12b-apply-chooser-scrolled');
  await back(page);
  await back(page);

  await tap(page, 'tabs.applications');
  await page.getByTestId('applications.screen').waitFor();
  await shot(page, '13-applications');
  await tap(page, 'application.row.a-interview');
  await page.getByTestId('application.screen').waitFor();
  await shot(page, '14-application-interview');
  await page.mouse.wheel(0, 900);
  await shot(page, '14b-application-interview-scrolled');
  await back(page);
  await tap(page, 'application.row.a-offer');
  await page.getByTestId('application.screen').waitFor();
  await shot(page, '15-application-offer');
  await back(page);

  await tap(page, 'tabs.profile');
  await page.getByTestId('profile.screen').waitFor();
  await shot(page, '16-profile');
  await page.mouse.wheel(0, 900);
  await shot(page, '16b-profile-scrolled');
  await tap(page, 'profile.settings');
  await page.getByTestId('settings.screen').waitFor();
  await shot(page, '17-settings');
  await tap(page, 'settings.delete');
  await page.getByTestId('delete.screen').waitFor();
  await shot(page, '20-delete');
  await back(page);
  await back(page);
  await tap(page, 'profile.edit');
  await page.getByTestId('builder.screen').waitFor();
  await shot(page, '19-builder');
  await back(page);
  await tap(page, 'topbar.notifications');
  await page.getByTestId('notifications.screen').waitFor();
  await shot(page, '18-notifications');
});
