import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { appRoutes } from '@/test/appRoutes';
import { installJobsBackend, makeJob } from '@/test/msw/jobs';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';

import { PUSHED_SCREEN_TITLES } from '../pushedScreens';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
});

// D32: pushed screens use the native stack header (system back chevron + title). The stretched ghost "← Back" buttons
// and the duplicated in-content titles are gone; a deep link still has somewhere to go back to (the tabs are anchored).
describe('pushed screens: native header', () => {
  it.each([
    ['/settings', 'settings.screen', 'Settings'],
    ['/notifications', 'notifications.screen', 'Notifications'],
    ['/saved-jobs', 'saved.screen', 'Saved jobs'],
    ['/delete-account', 'delete.screen', 'Delete account'],
  ])(
    '%s leaves its title to the native header and has no in-content Back button',
    async (url, testID, title) => {
      installJobsBackend({ jobs: [], saved: [] });
      await startSignedIn(url, testID);
      // Jest does not draw the native header; what matters is that the content no longer repeats the title...
      expect(screen.queryByRole('header', { name: title })).toBeNull();
      // ...and no longer draws its own Back button.
      expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
      expect(screen.queryByRole('button', { name: /back to/i })).toBeNull();
    },
  );

  it('every pushed route has a header title in sentence case (the root layout reads this map)', () => {
    expect(Object.keys(PUSHED_SCREEN_TITLES)).toEqual(
      expect.arrayContaining([
        'job/[id]',
        'saved-jobs',
        'gov-jobs',
        'intl-jobs',
        'notifications',
        'settings',
        'delete-account',
        'profile-builder',
        'cv-preview',
        'application/[id]',
        'apply/[jobId]/index',
        'apply/[jobId]/form',
        'apply/[jobId]/upload',
      ]),
    );
    for (const [route, title] of Object.entries(PUSHED_SCREEN_TITLES)) {
      if (route === 'job/[id]') continue; // the role becomes the title once the job is loaded
      expect(title).toMatch(/^[A-Z][a-z]/);
    }
  });

  it('a job opened from Home goes back to Home with the system back', async () => {
    const job = makeJob({ id: 'j1', role: 'Staff Nurse' });
    installJobsBackend({ jobs: [job] });
    const app = await startSignedIn('/', 'home.screen');
    await fireEvent.press(await screen.findByTestId('job.open.j1'));
    await screen.findByTestId('job.screen');
    expect(screen.queryByRole('button', { name: /back to opportunities/i })).toBeNull();
    await act(async () => {
      router.back();
    });
    await waitFor(() => expect(app.getPathname()).toBe('/'));
  });

  it('a deep link to a job can still go back: it lands on Home (tabs are the anchor)', async () => {
    const job = makeJob({ id: 'j1', role: 'Staff Nurse' });
    installJobsBackend({ jobs: [job] });
    const app = await renderRouter(appRoutes, { initialUrl: '/job/j1' });
    await screen.findByTestId('job.screen');
    expect(router.canGoBack()).toBe(true);
    await act(async () => {
      router.back();
    });
    await waitFor(() => expect(app.getPathname()).toBe('/'));
  });

  it('the tabs keep their own chrome (no second header from the stack)', async () => {
    installJobsBackend({ jobs: [] });
    await startSignedIn('/', 'home.screen');
    expect(screen.getAllByText('ApronHanger')).toHaveLength(1);
  });
});

describe('filters sheet options', () => {
  it('one full-height detent on every platform so the pinned footer is on screen', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const base = require('../filterSheetOptions.ts').filterSheetOptions;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ios = require('../filterSheetOptions.ios').filterSheetOptions;
    expect(base).toMatchObject({ presentation: 'formSheet', sheetAllowedDetents: [1] });
    expect(ios).toMatchObject({ presentation: 'formSheet', sheetAllowedDetents: [1] });
  });
});
