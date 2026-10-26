import { expect, test } from '@playwright/test';

import { doctor, mockBackend, nurse, signIn } from './jobsHelpers';

// Quick web checks of the job screens (PHASE-2 Task 10): list, search and filters, save with rollback, saved list.

test('Home lists the jobs, then a job opens with its details', async ({ page }) => {
  await mockBackend(page, [nurse, doctor]);
  await signIn(page);

  await expect(page.getByTestId('home.count')).toHaveText('Showing 2 of 2 verified roles');
  await expect(page.getByTestId('recommended.rail')).toBeVisible();
  await page.getByTestId('job.open.n1').click();

  await expect(page.getByTestId('job.screen')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Staff Nurse' })).toBeVisible();
  await expect(page.getByText('Verified Hospital')).toBeVisible();
  await expect(page.getByTestId('job.salary')).toHaveText('₹3–4.5 LPA');
  await expect(page.getByText("Your profile matches 80% of this role's criteria.")).toBeVisible();
});

test('Search: text and a filter narrow the list', async ({ page }) => {
  await mockBackend(page, [nurse, doctor]);
  await signIn(page);
  await page.getByTestId('tabs.search').click();
  await expect(page.getByTestId('search.count')).toHaveText('Showing 2 of 2 verified roles');

  await page.getByTestId('search.query').fill('cardio');
  await expect(page.getByTestId('search.count')).toHaveText('Showing 1 of 2 verified roles');
  // Home stays mounted underneath, so look inside the Search list.
  const results = page.getByTestId('search.list');
  await expect(results.getByTestId('job.card.d1')).toBeVisible();
  await expect(results.getByTestId('job.card.n1')).toBeHidden();

  await page.getByTestId('search.query').fill('');
  await page.getByTestId('search.filters').click();
  await page.getByTestId('filters.type.Locum').click();
  await expect(page.getByTestId('filters.summary')).toHaveText('1 applied');
  await page.getByTestId('filters.done').click();
  await expect(page.getByTestId('search.count')).toHaveText('Showing 1 of 2 verified roles');
  await expect(page.getByTestId('search.filters')).toHaveAccessibleName('Filters, 1 active');
});

test('Saving: the bookmark changes at once; a failed save goes back with the error', async ({ page }) => {
  const backend = await mockBackend(page, [nurse]);
  await signIn(page);
  await expect(page.getByTestId('job.card.n1')).toBeVisible();

  await page.getByTestId('job.save.n1').click();
  await expect(page.getByText('Job saved')).toBeVisible();
  await expect(page.getByTestId('job.save.n1')).toHaveAccessibleName('Remove from saved jobs');
  expect(backend.saved).toHaveLength(1);

  await page.getByTestId('job.save.n1').click();
  await expect(page.getByTestId('job.save.n1')).toHaveAccessibleName('Save job');
  expect(backend.saved).toHaveLength(0);

  backend.failSave = true;
  await page.getByTestId('job.save.n1').click();
  await expect(page.getByText('Failed to save job')).toBeVisible();
  await expect(page.getByTestId('job.save.n1')).toHaveAccessibleName('Save job');
});

test('Saved jobs lists a saved job', async ({ page }) => {
  const backend = await mockBackend(page, [nurse]);
  backend.saved.push({ savedAt: '2026-10-26T09:00:00.000Z', job: nurse });
  await signIn(page);
  await page.getByTestId('home.link.saved').click();
  await expect(page.getByTestId('saved.count')).toHaveText('1 role bookmarked for later');
  // Home stays mounted underneath, so look inside the Saved list.
  await expect(page.getByTestId('saved.list').getByTestId('job.card.n1')).toBeVisible();
});
