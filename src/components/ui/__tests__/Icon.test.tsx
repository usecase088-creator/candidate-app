// Icons at large font sizes. On Android expo-symbols draws the icon as text in a box of `size`, and that text grows with
// the phone's font size, so at font scale 2 it was clipped (seen on the phone, 2026-11-01). iPhone draws a real symbol.
import { render, screen } from '@/test/render';
import * as RN from 'react-native';

import { Icon as AndroidIcon } from '../Icon.android';
import { Icon as IosIcon } from '../Icon.ios';

jest.mock('expo-symbols', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SymbolView: (props: { size?: number; style?: unknown; testID?: string }) => (
      <View testID={props.testID} style={props.style} accessibilityHint={`size ${props.size}`} />
    ),
  };
});

const NAME = { ios: 'bell', android: 'notifications', web: 'notifications' } as const;

let currentFontScale = 1;
function useFontScale(fontScale: number) {
  currentFontScale = fontScale;
}

beforeEach(() => {
  currentFontScale = 1;
  // React Native's Jest setup reports fontScale 2 by default; useWindowDimensions reads Dimensions.get('window').
  jest
    .spyOn(RN.Dimensions, 'get')
    .mockImplementation(() => ({ width: 320, height: 640, scale: 3, fontScale: currentFontScale }));
});

afterEach(() => jest.restoreAllMocks());

describe('Icon (Android)', () => {
  it('keeps the drawn icon at its size when the phone font is made larger', async () => {
    useFontScale(2);
    await render(<AndroidIcon testID="icon" name={NAME} size={24} tintColor="#000" />);
    const icon = screen.getByTestId('icon');
    // The glyph's font size is divided by the font scale; Android multiplies it back to 24.
    expect(icon.props.accessibilityHint).toBe('size 12');
    // The box stays 24 x 24, so nothing around it moves.
    expect(icon).toHaveStyle({ width: 24, height: 24 });
  });

  it('changes nothing at the normal font size', async () => {
    useFontScale(1);
    await render(<AndroidIcon testID="icon" name={NAME} size={20} tintColor="#000" />);
    expect(screen.getByTestId('icon').props.accessibilityHint).toBe('size 20');
    expect(screen.getByTestId('icon')).toHaveStyle({ width: 20, height: 20 });
  });
});

describe('Icon (iPhone)', () => {
  it('passes the size through: a real symbol does not grow with the font', async () => {
    useFontScale(2);
    await render(<IosIcon testID="icon" name={NAME} size={24} tintColor="#000" />);
    expect(screen.getByTestId('icon').props.accessibilityHint).toBe('size 24');
  });
});
