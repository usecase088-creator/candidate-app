import { useFonts } from 'expo-font';
import { renderRouter, screen } from 'expo-router/testing-library';

import AuthLayout from '@/app/(auth)/_layout';
import Login from '@/app/(auth)/login';
import RootLayout from '@/app/_layout';
import DevUi, { isDevToolsEnabled } from '@/app/dev-ui';
import { resetSessionForTests } from '@/features/auth/sessionStore';

// Start-up, guards and splash are covered in navigation.test.tsx. This file: the dev-only UI catalog.
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

const routes = { _layout: RootLayout, '(auth)/_layout': AuthLayout, '(auth)/login': Login, 'dev-ui': DevUi };

beforeEach(() => {
  resetSessionForTests();
  jest.mocked(useFonts).mockReturnValue([true, null]);
});

describe('UI catalog (development builds only)', () => {
  it('is enabled only in the development variant', () => {
    expect(isDevToolsEnabled({ appVariant: 'development' })).toBe(true);
    expect(isDevToolsEnabled({ appVariant: 'preview' })).toBe(false);
    expect(isDevToolsEnabled({ appVariant: 'production' })).toBe(false);
  });

  it('shows every base component in development, signed in or not', async () => {
    await renderRouter(routes, { initialUrl: '/dev-ui' });
    await screen.findByTestId('dev.ui');
    for (const id of [
      'dev.ui.button.primary',
      'dev.ui.button.gradient',
      'dev.ui.email',
      'dev.ui.password',
      'dev.ui.otp',
      'dev.ui.error',
      'dev.ui.empty',
      'dev.ui.toast',
    ]) {
      expect(screen.getByTestId(id)).toBeOnTheScreen();
    }
  });
});
