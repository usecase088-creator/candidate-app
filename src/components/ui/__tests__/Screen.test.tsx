import { StyleSheet, Text } from 'react-native';

import { colors } from '@/theme/tokens';
import { renderWithProviders, screen } from '@/test/render';

import { keyboardBehavior as androidBehavior } from '../keyboardBehavior.android';
import { keyboardBehavior as iosBehavior } from '../keyboardBehavior.ios';
import { Screen } from '../Screen';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

it('renders its children on the theme background', async () => {
  await renderWithProviders(
    <Screen testID="login.screen">
      <Text>content</Text>
    </Screen>,
  );
  expect(screen.getByText('content')).toBeOnTheScreen();
  expect(flat(screen.getByTestId('login.screen').props.style).backgroundColor).toBe(colors.background);
});

it('scrolls when asked, keeping taps on buttons while the keyboard is open', async () => {
  await renderWithProviders(
    <Screen testID="s" scroll>
      <Text>content</Text>
    </Screen>,
  );
  expect(screen.getByTestId('s.scroll').props.keyboardShouldPersistTaps).toBe('handled');
});

// `behavior` lives on the KeyboardAvoidingView component, which RNTL does not expose; the platform files are tested below.
it('wraps content in a KeyboardAvoidingView', async () => {
  await renderWithProviders(
    <Screen testID="s">
      <Text>content</Text>
    </Screen>,
  );
  expect(screen.getByTestId('s.keyboard')).toBeOnTheScreen();
});

it('uses padding on iOS and lets Android resize the window (edge-to-edge)', () => {
  expect(iosBehavior).toBe('padding');
  expect(androidBehavior).toBeUndefined();
});
