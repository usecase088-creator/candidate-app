import { useFonts } from 'expo-font';
import { act, screen } from 'expo-router/testing-library';

import { useSession } from '@/features/auth/sessionStore';
import { installJobsBackend, makeJob } from '@/test/msw/jobs';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';

import { useFilterStore } from '../filterStore';
import { SAVED_JOBS_KEY } from '../hooks/queryKeys';
import { appQueryClient } from '@/lib/queryClient';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
});

it('sign-out clears search text, filters and cached jobs, so the next user starts clean', async () => {
  const job = makeJob({ id: 'n1' });
  installJobsBackend({ jobs: [job], saved: [{ savedAt: '2026-10-26T09:00:00.000Z', job }] });
  await startSignedIn('/search', 'search.screen');
  await screen.findByTestId('job.card.n1');
  expect(appQueryClient.getQueryData(SAVED_JOBS_KEY)).toBeDefined();

  act(() => {
    useFilterStore.getState().setQuery('nurse');
    useFilterStore.getState().toggleType('Locum');
    useFilterStore.getState().setCategory('Nurses');
  });
  await act(async () => useSession.getState().signOut('user'));
  expect(useSession.getState().status).toBe('signedOut');

  expect(useFilterStore.getState()).toMatchObject({ query: '', category: null, types: [] });
  expect(appQueryClient.getQueryData(SAVED_JOBS_KEY)).toBeUndefined();
});
