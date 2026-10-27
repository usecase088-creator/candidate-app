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

// Quick web checks of apply and My Applications (PHASE-3 Task 9). Native pickers, the share sheet and the phone's
// alert are checked with Maestro; here the browser's confirm box stands in for the alert.

test('My Applications: rows, tabs with counts, and a tab filters', async ({ page }) => {
  await mockBackend(page, [nurse]);
  await mockApplications(page, { apps: [interview, offer, application({ id: 'a-applied' })], me: profileMe });
  await signIn(page);
  await page.getByTestId('tabs.applications').click();

  await expect(page.getByTestId('applications.screen')).toBeVisible();
  await expect(page.getByTestId('applications.count')).toContainText('3 applications');
  await expect(page.getByTestId('applications.tab.all')).toContainText('All 3');
  await expect(page.getByTestId('applications.tab.offer-sent')).toContainText('Offer Sent 1');

  await page.getByTestId('applications.tab.offer-sent').click();
  const list = page.getByTestId('applications.list');
  await expect(list.getByTestId('application.row.a-offer')).toBeVisible();
  await expect(list.getByTestId('application.row.a-interview')).toBeHidden();
});

test('Interview: Accept changes the status; Decline asks first', async ({ page }) => {
  await mockBackend(page, [nurse]);
  const backend = await mockApplications(page, { apps: [interview], me: profileMe });
  await signIn(page);
  await openApplication(page, 'a-interview');
  await expect(page.getByText('30 Oct 2026, 7:30 pm')).toBeVisible();

  // Decline: the browser confirm box. Cancel keeps everything as it was.
  page.once('dialog', (dialog) => void dialog.dismiss());
  await page.getByTestId('action.interview.decline').click();
  await expect(page.getByTestId('action.interview.accept')).toBeVisible();
  expect(backend.patched).toHaveLength(0);

  await page.getByTestId('action.interview.accept').click();
  await expect(page.getByText('Response recorded successfully!')).toBeVisible();
  await expect(page.getByTestId('application.status')).toHaveAccessibleName('Status: Interview Accepted');
  expect(backend.patched).toEqual([{ status: 'InterviewAccepted' }]);
});

test('Interview: a reschedule request needs a note', async ({ page }) => {
  await mockBackend(page, [nurse]);
  const backend = await mockApplications(page, { apps: [interview], me: profileMe });
  await signIn(page);
  await openApplication(page, 'a-interview');
  await page.getByTestId('action.interview.reschedule').click();
  await expect(page.getByTestId('action.interview.reschedule.submit')).toBeDisabled();
  await page.getByTestId('action.interview.note').fill('Friday after 3 pm');
  await page.getByTestId('action.interview.reschedule.submit').click();
  await expect(page.getByText('Response recorded successfully!')).toBeVisible();
  expect(backend.patched).toEqual([
    { status: 'RescheduleRequested', candidateResponseNote: 'Friday after 3 pm' },
  ]);
});

test('Offer: Reject asks first, then rejects', async ({ page }) => {
  await mockBackend(page, [nurse]);
  const backend = await mockApplications(page, { apps: [offer], me: profileMe });
  await signIn(page);
  await openApplication(page, 'a-offer');
  await expect(page.getByRole('heading', { name: 'Offer Letter Received' })).toBeVisible();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByTestId('action.offer.reject').click();
  await expect(page.getByTestId('application.status')).toHaveAccessibleName('Status: Offer Rejected');
  expect(backend.patched).toEqual([{ status: 'OfferRejected' }]);
});

test('Quick Apply from a job: Apply Now, choose, apply, and it shows in My Applications', async ({
  page,
}) => {
  await mockBackend(page, [nurse]);
  const backend = await mockApplications(page, { apps: [], me: profileMe });
  await signIn(page);
  await page.getByTestId('job.open.n1').click();
  await page.getByTestId('job.apply').click();

  await expect(page.getByTestId('apply.screen')).toBeVisible();
  await expect(page.getByText('Choose one way to apply')).toBeVisible();
  await expect(page.getByText('One tap with your saved form CV')).toBeVisible();
  await page.getByTestId('apply.quick').click();

  await expect(page.getByText('Application submitted!')).toBeVisible();
  await expect(page.getByTestId('applications.screen')).toBeVisible();
  await expect(page.getByTestId('applications.count')).toContainText('1 application');
  expect(backend.posted).toMatchObject([
    { jobId: 'n1', cvSource: 'form', profile: { name: 'Demo Applicant' } },
  ]);
});

test('Without a form CV, CV upload and Quick Apply are locked and say why', async ({ page }) => {
  await mockBackend(page, [nurse]);
  await mockApplications(page, {
    apps: [],
    me: { id: 'c1', name: 'Test Candidate', cvSource: null, profile: null },
  });
  await signIn(page);
  await openApplyChooser(page, 'n1');
  await expect(
    page.getByText('You must complete the structured form once before you can use CV upload.'),
  ).toBeVisible();
  await expect(
    page.getByText('Quick Apply unlocks after you complete the structured form once.'),
  ).toBeVisible();
  await expect(page.getByTestId('apply.choice.upload')).toBeDisabled();
});

test('A job already applied to says "Already applied"', async ({ page }) => {
  await mockBackend(page, [nurse]);
  await mockApplications(page, { apps: [application({ id: 'a1', jobId: 'n1' })], me: profileMe });
  await signIn(page);
  await openApplyChooser(page, 'n1');
  await expect(page.getByText('Already applied')).toBeVisible();
  await page.getByTestId('apply.applied.view').click();
  await expect(page.getByTestId('applications.screen')).toBeVisible();
});
