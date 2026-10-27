import { onlineManager } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Network from 'expo-network';
import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { delay, http, HttpResponse } from 'msw';

import { useSession } from '@/features/auth/sessionStore';
import { appQueryClient } from '@/lib/queryClient';
import {
  applied,
  documentsRequested,
  interviewVirtual,
  rejected,
  seededApplications,
} from '@/test/fixtures/applications';
import { installApplicationsBackend } from '@/test/msw/applications';
import { API } from '@/test/msw/handlers';
import { installJobsBackend } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';

import { APPLICATIONS_KEY } from '../hooks/queryKeys';
import { APPLICATIONS_LIST_PROPS } from '../screens/ApplicationsScreen';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
  installJobsBackend({ jobs: [] });
});
afterEach(() => {
  jest
    .mocked(Network.getNetworkStateAsync)
    .mockResolvedValue({ isConnected: true, isInternetReachable: true } as never);
  onlineManager.setOnline(true);
});

const open = () => startSignedIn('/applications', 'applications.screen');
const tab = (name: string) =>
  screen.getByTestId(`applications.tab.${name.toLowerCase().replace(/\s+/g, '-')}`);

describe('My Applications: content (website wording)', () => {
  it('title, count with the fetch time, and the eight seeded rows, newest first', async () => {
    installApplicationsBackend({ apps: [...seededApplications] as never });
    await open();
    expect(await screen.findByRole('header', { name: 'My Applications' })).toBeOnTheScreen();
    expect(await screen.findByText(/^8 applications · fetched at \d{2}:\d{2} (am|pm)$/)).toBeOnTheScreen();
    for (const row of seededApplications)
      expect(screen.getByTestId(`application.row.${row.id}`)).toBeOnTheScreen();
  });

  it('says "1 application" for one', async () => {
    installApplicationsBackend({ apps: [applied] as never });
    await open();
    expect(await screen.findByText(/^1 application · fetched at/)).toBeOnTheScreen();
  });

  it('every row shows what the website shows: role, hospital · city, applied date, status, last update', async () => {
    installApplicationsBackend({ apps: [applied] as never });
    await open();
    const row = within(await screen.findByTestId(`application.row.${applied.id}`));
    expect(row.getByText('ICU Nurse')).toBeOnTheScreen();
    expect(row.getByText('Seed City Multispeciality Hospital · Kolkata')).toBeOnTheScreen();
    expect(row.getByText('Applied 25 Oct 2026')).toBeOnTheScreen();
    expect(row.getByLabelText('Status: Applied')).toBeOnTheScreen();
    expect(row.getByText('Application received by hospital')).toBeOnTheScreen();
  });
});

describe('My Applications: tabs', () => {
  it('shows the nine tabs of the website, each with its count', async () => {
    installApplicationsBackend({ apps: [...seededApplications] as never });
    await open();
    await screen.findByTestId(`application.row.${applied.id}`);
    expect(tab('All')).toHaveTextContent('All 8');
    expect(tab('Applied')).toHaveTextContent('Applied 1');
    expect(tab('Reviewed')).toHaveTextContent('Reviewed 0');
    expect(tab('Interview Scheduled')).toHaveTextContent('Interview Scheduled 2');
    expect(tab('Shortlisted')).toHaveTextContent('Shortlisted 0');
    expect(tab('Documents Requested')).toHaveTextContent('Documents Requested 1');
    expect(tab('Offer Sent')).toHaveTextContent('Offer Sent 1');
    expect(tab('Rejected')).toHaveTextContent('Rejected 1');
    expect(tab('Joined')).toHaveTextContent('Joined 0');
  });

  it('a tab shows only its applications, and All brings them back', async () => {
    installApplicationsBackend({ apps: [...seededApplications] as never });
    await open();
    await screen.findByTestId(`application.row.${applied.id}`);
    await fireEvent.press(tab('Interview Scheduled'));
    expect(screen.getByTestId(`application.row.${interviewVirtual.id}`)).toBeOnTheScreen();
    expect(screen.queryByTestId(`application.row.${applied.id}`)).not.toBeOnTheScreen();
    expect(tab('Interview Scheduled').props.accessibilityState.selected).toBe(true);
    await fireEvent.press(tab('All'));
    expect(screen.getByTestId(`application.row.${applied.id}`)).toBeOnTheScreen();
  });

  it('a tab with nothing in it says so, with the website empty text', async () => {
    installApplicationsBackend({ apps: [applied] as never });
    await open();
    await screen.findByTestId(`application.row.${applied.id}`);
    await fireEvent.press(tab('Joined'));
    expect(await screen.findByText('No applications yet')).toBeOnTheScreen();
    expect(
      screen.getByText('Start applying to opportunities and track your progress here.'),
    ).toBeOnTheScreen();
  });

  it('every tab has a spoken label with its count', async () => {
    installApplicationsBackend({ apps: [...seededApplications] as never });
    await open();
    await screen.findByTestId(`application.row.${applied.id}`);
    expect(screen.getByLabelText('Interview Scheduled, 2')).toBeOnTheScreen();
  });
});

describe('My Applications: empty, loading, error, offline', () => {
  it('no applications: the website empty state and a way to browse', async () => {
    installApplicationsBackend({ apps: [] });
    await open();
    expect(await screen.findByText('No applications yet')).toBeOnTheScreen();
    expect(
      screen.getByText('Start applying to opportunities and track your progress here.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('applications.empty.action'));
    expect(await screen.findByTestId('home.screen')).toBeOnTheScreen();
  });

  it('shows placeholder cards while loading', async () => {
    installApplicationsBackend({ apps: [applied] as never });
    server.use(
      http.get(`${API}/api/applications`, async () => {
        await delay(300);
        return HttpResponse.json([applied]);
      }),
    );
    await open();
    expect(await screen.findByTestId('applications.loading')).toBeOnTheScreen();
    expect(await screen.findByTestId(`application.row.${applied.id}`)).toBeOnTheScreen();
  });

  it('a failed load shows Try Again (the website only has this on this screen too), and Try Again loads the list', async () => {
    installApplicationsBackend({ apps: [applied] as never });
    let calls = 0;
    server.use(
      http.get(`${API}/api/applications`, () =>
        ++calls === 1 ? HttpResponse.json({ error: 'boom' }, { status: 500 }) : HttpResponse.json([applied]),
      ),
    );
    await open();
    expect(await screen.findByTestId('applications.error')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Try Again'));
    expect(await screen.findByTestId(`application.row.${applied.id}`)).toBeOnTheScreen();
  });

  it('offline: a clear message instead of a spinner for ever', async () => {
    jest
      .mocked(Network.getNetworkStateAsync)
      .mockResolvedValue({ isConnected: false, isInternetReachable: false } as never);
    installApplicationsBackend({ apps: [applied] as never });
    await open();
    await act(async () => onlineManager.setOnline(false));
    expect(await screen.findByTestId('applications.offline')).toBeOnTheScreen();
  });

  it('a new application shows at the top: the list does not hold the old position (found on the phone)', () => {
    // FlashList keeps the visible rows in place when a row is added above them, which pushed a freshly submitted
    // application out of sight on the phone. This screen must show the newest application first, so that is off.
    expect(APPLICATIONS_LIST_PROPS.maintainVisibleContentPosition).toEqual({ disabled: true });
  });

  it('pull to refresh loads the list again', async () => {
    const backend = installApplicationsBackend({ apps: [applied] as never });
    await open();
    await screen.findByTestId(`application.row.${applied.id}`);
    const before = backend.calls.filter((c) => c === 'GET /api/applications').length;
    const list = screen.getByTestId('applications.list');
    await act(async () => {
      list.props.refreshControl.props.onRefresh();
    });
    await waitFor(() =>
      expect(backend.calls.filter((c) => c === 'GET /api/applications').length).toBe(before + 1),
    );
  });
});

describe('My Applications: opening an application and signing out', () => {
  it('tapping a row opens that application', async () => {
    installApplicationsBackend({ apps: [documentsRequested, rejected] as never });
    await open();
    await fireEvent.press(await screen.findByTestId(`application.row.${documentsRequested.id}`));
    expect(await screen.findByTestId('application.screen')).toBeOnTheScreen();
  });

  it('sign-out clears the applications, so the next user never sees them', async () => {
    installApplicationsBackend({ apps: [applied] as never });
    await open();
    await screen.findByTestId(`application.row.${applied.id}`);
    expect(appQueryClient.getQueryData(APPLICATIONS_KEY)).toBeDefined();
    await act(async () => useSession.getState().signOut('user'));
    expect(appQueryClient.getQueryData(APPLICATIONS_KEY)).toBeUndefined();
  });
});
