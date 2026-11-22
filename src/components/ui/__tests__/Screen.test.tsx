import { HeaderHeightContext, HeaderShownContext } from 'expo-router/react-navigation';
import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors } from '@/theme/tokens';
import { renderHook, renderWithProviders, screen } from '@/test/render';

import {
  keyboardBehavior as androidBehavior,
  keyboardOffset as androidOffset,
} from '../keyboardBehavior.android';
import { keyboardBehavior as iosBehavior, keyboardOffset as iosOffset } from '../keyboardBehavior.ios';
import { Screen, useKeyboardOffset } from '../Screen';

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

it('pads for the keyboard on iOS and on Android (edge-to-edge: the window no longer resizes reliably)', () => {
  expect(iosBehavior).toBe('padding');
  // Found on the phone: the focused Password field stayed under the keyboard at large text.
  expect(androidBehavior).toBe('padding');
});

// R3 #3: under a native stack header the KeyboardAvoidingView frame starts below the header, so iOS padding came out
// short by the header height. iOS offsets by it; Android resizes the window and needs none.
describe('keyboard offset under a native header', () => {
  it('iOS and Android offset by the header height (both pad from a frame that starts below it)', () => {
    expect(iosOffset(91)).toBe(91);
    expect(iosOffset(0)).toBe(0);
    expect(androidOffset(56)).toBe(56);
  });

  it('reads the header height of the stack the screen is in (none outside a stack)', async () => {
    const inStack = ({ children }: { children: ReactNode }) => (
      <HeaderHeightContext.Provider value={103}>{children}</HeaderHeightContext.Provider>
    );
    expect((await renderHook(() => useKeyboardOffset(), { wrapper: inStack })).result.current).toBe(103);
    expect((await renderHook(() => useKeyboardOffset())).result.current).toBe(0);
  });
});

// Found on the phone: pushed screens showed an empty status-bar-high band between the native header and the content,
// because Screen still padded the top inset the header already covers.
describe('top inset under a native header', () => {
  const underHeader = ({ children }: { children: ReactNode }) => (
    <HeaderShownContext.Provider value>{children}</HeaderShownContext.Provider>
  );

  it('a pushed screen (native header shown) does not pad the top inset, whatever edges it asks for', async () => {
    await renderWithProviders(
      <Screen testID="s" edges={['top', 'bottom']}>
        <Text>content</Text>
      </Screen>,
      { wrapper: underHeader },
    );
    expect(screen.getByTestId('s').props.edges).toMatchObject({ top: 'off', bottom: 'additive' });
  });

  it('a screen without a header (auth) keeps the top inset', async () => {
    await renderWithProviders(
      <Screen testID="s">
        <Text>content</Text>
      </Screen>,
    );
    expect(screen.getByTestId('s').props.edges).toMatchObject({ top: 'additive' });
  });
});
