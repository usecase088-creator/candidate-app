import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Text } from 'react-native';

import { render, screen } from '@/test/render';

import { FontGate } from '../FontGate';
import { fontAssets } from '../fonts';
import { fonts } from '../tokens';

// Native boundaries: font loading and the splash screen.
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

it('loads exactly the Inter faces the tokens name', () => {
  expect(Object.keys(fontAssets).sort()).toEqual(Object.values(fonts).sort());
});

it('renders nothing and keeps the splash while fonts load', async () => {
  jest.mocked(useFonts).mockReturnValue([false, null]);
  await render(
    <FontGate>
      <Text>app</Text>
    </FontGate>,
  );
  expect(screen.queryByText('app')).toBeNull();
  expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  expect(useFonts).toHaveBeenCalledWith(fontAssets);
});

it('shows the app and hides the splash once fonts are loaded', async () => {
  jest.mocked(useFonts).mockReturnValue([true, null]);
  await render(
    <FontGate>
      <Text>app</Text>
    </FontGate>,
  );
  expect(screen.getByText('app')).toBeTruthy();
  expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
});

it('still starts with the system font if loading fails (never stuck on the splash)', async () => {
  jest.mocked(useFonts).mockReturnValue([false, new Error('font missing')]);
  await render(
    <FontGate>
      <Text>app</Text>
    </FontGate>,
  );
  expect(screen.getByText('app')).toBeTruthy();
  expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
});
