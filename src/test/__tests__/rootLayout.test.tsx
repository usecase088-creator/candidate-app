import { useFonts } from 'expo-font';
import { renderRouter, screen } from 'expo-router/testing-library';

import RootLayout from '@/app/_layout';
import DevUi, { isDevToolsEnabled } from '@/app/dev-ui';
import Index from '@/app/index';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

const routes = { _layout: RootLayout, index: Index, 'dev-ui': DevUi };

beforeEach(() => jest.mocked(useFonts).mockReturnValue([true, null]));

describe('root layout', () => {
  it('shows the first screen once fonts are ready', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByTestId('home.placeholder')).toBeOnTheScreen();
  });

  it('shows nothing (splash stays) while fonts load', async () => {
    jest.mocked(useFonts).mockReturnValue([false, null]);
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.queryByTestId('home.placeholder')).toBeNull();
  });
});

describe('UI catalog (development builds only)', () => {
  it('is enabled only in the development variant', () => {
    expect(isDevToolsEnabled({ appVariant: 'development' })).toBe(true);
    expect(isDevToolsEnabled({ appVariant: 'preview' })).toBe(false);
    expect(isDevToolsEnabled({ appVariant: 'production' })).toBe(false);
  });

  it('shows every base component in development', async () => {
    await renderRouter(routes, { initialUrl: '/dev-ui' });
    for (const id of [
      'dev.ui',
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
