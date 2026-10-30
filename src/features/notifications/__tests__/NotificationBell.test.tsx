import { useFonts } from 'expo-font';
import { fireEvent, screen } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { applicantMe } from '@/test/fixtures/applications';
import { API } from '@/test/msw/handlers';
import { installJobsBackend } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

const item = (id: string, read: boolean) => ({
  id,
  title: 'Interview scheduled',
  message: 'Your interview is on Friday.',
  read,
  link: '/applications',
  createdAt: '2026-10-20T10:00:00.000Z',
});

function setup(unread: number) {
  installJobsBackend({ me: applicantMe });
  const items = [...Array.from({ length: unread }, (_, i) => item(`u${i}`, false)), item('r', true)];
  server.use(
    http.get(`${API}/api/notifications`, () => HttpResponse.json({ data: items, unreadCount: unread })),
  );
}

beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
});

describe('Notification bell in the top bar', () => {
  it.each([
    ['/', 'home.screen'],
    ['/search', 'search.screen'],
    ['/applications', 'applications.screen'],
    ['/profile', 'profile.screen'],
  ])('is on the %s tab', async (path, screenId) => {
    setup(0);
    await startSignedIn(path, screenId);
    expect(await screen.findByTestId('topbar.notifications')).toBeOnTheScreen();
  });

  it('shows the unread count and says it to screen readers', async () => {
    setup(3);
    await startSignedIn('/', 'home.screen');
    expect(await screen.findByTestId('topbar.notifications.count')).toHaveTextContent('3');
    expect(screen.getByTestId('topbar.notifications')).toHaveProp(
      'accessibilityLabel',
      'Notifications, 3 unread',
    );
  });

  it('caps a big count at 99+', async () => {
    setup(120);
    await startSignedIn('/', 'home.screen');
    expect(await screen.findByTestId('topbar.notifications.count')).toHaveTextContent('99+');
  });

  it('has no count when everything is read', async () => {
    setup(0);
    await startSignedIn('/', 'home.screen');
    expect(await screen.findByTestId('topbar.notifications')).toHaveProp('accessibilityLabel', 'Notifications');
    expect(screen.queryByTestId('topbar.notifications.count')).toBeNull();
  });

  it('still works as a plain bell when the count cannot be loaded', async () => {
    installJobsBackend({ me: applicantMe });
    server.use(http.get(`${API}/api/notifications`, () => HttpResponse.json({ error: 'x' }, { status: 500 })));
    await startSignedIn('/', 'home.screen');
    await fireEvent.press(await screen.findByTestId('topbar.notifications'));
    expect(await screen.findByTestId('notifications.screen')).toBeOnTheScreen();
  });

  it('opens the notifications list', async () => {
    setup(1);
    await startSignedIn('/applications', 'applications.screen');
    await fireEvent.press(await screen.findByTestId('topbar.notifications'));
    expect(await screen.findByTestId('notifications.screen')).toBeOnTheScreen();
  });

  it('the Profile tab no longer has its own Notifications button', async () => {
    setup(1);
    await startSignedIn('/profile', 'profile.screen');
    await screen.findByTestId('topbar.notifications');
    expect(screen.queryByTestId('profile.notifications')).toBeNull();
  });
});
