import { useFonts } from 'expo-font';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
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

type N = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
};
const n = (over: Partial<N> & { id: string }): N => ({
  title: 'Interview scheduled',
  message: 'Your interview is on Friday.',
  read: false,
  link: '/applications',
  createdAt: '2026-10-20T10:00:00.000Z',
  ...over,
});

let calls: string[];
function setup(items: N[], listStatus = 200) {
  calls = [];
  installJobsBackend({ me: applicantMe });
  server.use(
    http.get(`${API}/api/notifications`, () =>
      listStatus === 200
        ? HttpResponse.json({ data: items, unreadCount: items.filter((i) => !i.read).length })
        : HttpResponse.json({ error: 'x' }, { status: listStatus }),
    ),
    http.patch(`${API}/api/notifications/read-all`, () => {
      calls.push('read-all');
      return HttpResponse.json({ ok: true });
    }),
    http.patch(`${API}/api/notifications/:id/read`, ({ params }) => {
      calls.push(`read ${String(params.id)}`);
      const item = items.find((i) => i.id === params.id);
      return item
        ? HttpResponse.json({ ...item, read: true })
        : HttpResponse.json({ error: 'nf' }, { status: 404 });
    }),
  );
}
const open = () => startSignedIn('/notifications', 'notifications.screen');

beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
});

describe('Notifications', () => {
  it('lists notifications, newest first as the server sends them, with the unread ones marked', async () => {
    setup([n({ id: 'a', title: 'Offer sent' }), n({ id: 'b', title: 'Old news', read: true })]);
    await open();
    expect(await screen.findByText('Offer sent')).toBeOnTheScreen();
    expect(screen.getByText('Old news')).toBeOnTheScreen();
    expect(screen.getByTestId('notifications.item.a')).toHaveProp(
      'accessibilityLabel',
      expect.stringContaining('Unread'),
    );
    expect(screen.getByTestId('notifications.item.b').props.accessibilityLabel).not.toContain('Unread');
    expect(screen.getByTestId('notifications.unread')).toHaveTextContent('1 unread');
  });

  it('says so when there is nothing', async () => {
    setup([]);
    await open();
    expect(await screen.findByText('No notifications yet')).toBeOnTheScreen();
  });

  it('shows Try Again when the list cannot be loaded', async () => {
    setup([], 500);
    await open();
    expect(await screen.findByTestId('notifications.error')).toBeOnTheScreen();
  });

  it('marks one as read and opens the screen its link points to', async () => {
    setup([n({ id: 'a', link: '/applications' })]);
    await open();
    await fireEvent.press(await screen.findByTestId('notifications.item.a'));
    await waitFor(() => expect(calls).toEqual(['read a']));
    expect(await screen.findByTestId('applications.screen')).toBeOnTheScreen();
  });

  it('marks as read and stays when the link is not one the app can open', async () => {
    setup([n({ id: 'a', link: '/settings' })]);
    await open();
    await fireEvent.press(await screen.findByTestId('notifications.item.a'));
    await waitFor(() => expect(calls).toEqual(['read a']));
    expect(screen.getByTestId('notifications.screen')).toBeOnTheScreen();
  });

  it('does not call the server again for one that is already read', async () => {
    setup([n({ id: 'a', read: true, link: '/profile' })]);
    await open();
    await fireEvent.press(await screen.findByTestId('notifications.item.a'));
    expect(await screen.findByTestId('profile.screen')).toBeOnTheScreen();
    expect(calls).toEqual([]);
  });

  it('marks all as read', async () => {
    setup([n({ id: 'a' }), n({ id: 'b' })]);
    await open();
    await fireEvent.press(await screen.findByTestId('notifications.readAll'));
    await waitFor(() => expect(calls).toEqual(['read-all']));
  });

  it('is reached from the Profile tab', async () => {
    setup([n({ id: 'a' })]);
    await startSignedIn('/profile', 'profile.screen');
    await fireEvent.press(await screen.findByTestId('profile.notifications'));
    expect(await screen.findByTestId('notifications.screen')).toBeOnTheScreen();
  });
});
