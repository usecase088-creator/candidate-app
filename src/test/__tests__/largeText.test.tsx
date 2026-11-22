// Layout rules for 320 pt width and font scale 2 (CLAUDE.md). Each one comes from a check on the Realme phone
// (2026-10-31, density 540 = 320 dp, font scale 2.0) where text ran off the screen or covered an icon.
import { useFonts } from 'expo-font';
import { renderRouter, screen } from 'expo-router/testing-library';
import { StyleSheet } from 'react-native';
import { http, HttpResponse } from 'msw';

import { applicantMe } from '@/test/fixtures/applications';
import { API } from '@/test/msw/handlers';
import { installJobsBackend } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { appRoutes } from '@/test/appRoutes';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

const style = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);

beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
});

describe('large text (font scale 2, 320 pt)', () => {
  it('tab bar labels grow only a little and stay on one line (they were cut off at the bottom)', async () => {
    installJobsBackend({ me: applicantMe });
    await startSignedIn('/', 'home.screen');
    for (const name of ['home', 'search', 'applications', 'profile']) {
      const label = screen.getByTestId(`tabs.${name}.label`);
      expect(label).toHaveProp('maxFontSizeMultiplier', 1.3);
      expect(label).toHaveProp('numberOfLines', 1);
      // "Applications" is wider than its tab at font scale 2: it shrinks to fit instead of ending in dots.
      expect(label).toHaveProp('adjustsFontSizeToFit', true);
      expect(label).toHaveProp('minimumFontScale', 0.75);
    }
  });

  it('the top bar: the brand stays on one line with a capped size, and the badge never covers the bell', async () => {
    installJobsBackend({ me: applicantMe });
    server.use(
      http.get(`${API}/api/notifications`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'a',
              title: 't',
              message: 'm',
              read: false,
              link: null,
              createdAt: '2026-10-20T10:00:00.000Z',
            },
          ],
          unreadCount: 1,
        }),
      ),
    );
    await startSignedIn('/', 'home.screen');
    expect(screen.getByTestId('topbar.brand')).toHaveProp('maxFontSizeMultiplier', 1.5);
    expect(await screen.findByTestId('topbar.notifications.count')).toHaveProp('maxFontSizeMultiplier', 1);
  });

  it('the top bar of a visitor who is not signed in: the Sign in button label grows at most 1.3 times (it shares the bar with the brand)', async () => {
    await renderRouter(appRoutes, { initialUrl: '/' });
    await screen.findByTestId('topbar.signin');
    expect(screen.getByText('Sign in')).toHaveProp('maxFontSizeMultiplier', 1.3);
  });

  it('notifications: "Mark all as read" wraps under the count instead of running off the screen', async () => {
    installJobsBackend({ me: applicantMe });
    server.use(
      http.get(`${API}/api/notifications`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'a',
              title: 't',
              message: 'm',
              read: false,
              link: null,
              createdAt: '2026-10-20T10:00:00.000Z',
            },
          ],
          unreadCount: 1,
        }),
      ),
    );
    await startSignedIn('/notifications', 'notifications.screen');
    await screen.findByTestId('notifications.readAll');
    expect(style('notifications.actions')).toMatchObject({ flexWrap: 'wrap' });
  });

  it('sign in: the mode tabs stay readable (no auto-shrink to ~6 pt), wrap to 2 lines and grow the track', async () => {
    await renderRouter(appRoutes, { initialUrl: '/login' });
    await screen.findByTestId('login.screen');
    // Found on the phone at 2.0: adjustsFontSizeToFit shrank "Sign In" / "Create Account" to about 6 pt.
    for (const name of ['Sign In', 'Create Account']) {
      const label = screen.getByText(name);
      expect(label).toHaveProp('maxFontSizeMultiplier', 1.3);
      expect(label).toHaveProp('numberOfLines', 2);
      expect(label.props.adjustsFontSizeToFit).toBeFalsy();
    }
    const track = style('auth.tabs');
    expect(track.height).toBeUndefined();
    expect(track.minHeight).toBe(48);
    // The sliding tile is pinned to the track's top and bottom, so it follows the measured height.
    expect(style('auth.tabs.indicator')).toMatchObject({ top: 4, bottom: 4 });
  });
});
