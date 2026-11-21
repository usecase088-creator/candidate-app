import { StyleSheet } from 'react-native';

import { haptic } from '@/lib/haptics';
import { colors, fonts, radius } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { Button } from '../Button';

jest.mock('@/lib/haptics', () => ({ haptic: jest.fn() }));

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};
afterEach(() => jest.clearAllMocks());

// D32 button: three sizes, radius 12, 15/600 label, loading keeps the width, disabled is a muted fill (not a ghost),
// fullWidth={false} really hugs, press feedback through PressableScale, haptic by meaning.
describe('Button (D32)', () => {
  it('hugs its label when fullWidth is false (was a no-op: the "← Back" ghost buttons stretched and centred)', async () => {
    await renderWithProviders(
      <Button testID="b" label="Back" fullWidth={false} variant="ghost" onPress={() => {}} />,
    );
    expect(flat(screen.getByTestId('b').props.style).alignSelf).toBe('flex-start');
  });

  it('stretches by default', async () => {
    await renderWithProviders(<Button testID="b" label="Go" onPress={() => {}} />);
    expect(flat(screen.getByTestId('b').props.style).alignSelf).toBe('stretch');
  });

  it.each([
    ['lg', 48],
    ['md', 44],
    ['sm', 36],
  ] as const)('size %s is %i tall, radius 12, never a fixed height', async (size, h) => {
    await renderWithProviders(<Button testID="b" label="Go" size={size} onPress={() => {}} />);
    const s = flat(screen.getByTestId('b').props.style);
    expect(s.minHeight).toBe(h);
    expect(s.height).toBeUndefined();
    expect(s.borderRadius).toBe(radius.md);
  });

  it('label is the button text style (15 semibold, capped at 1.3x)', async () => {
    await renderWithProviders(<Button testID="b" label="Apply now" onPress={() => {}} />);
    const label = screen.getByText('Apply now');
    expect(flat(label.props.style)).toMatchObject({ fontSize: 15, fontFamily: fonts.semibold });
    expect(label).toHaveProp('maxFontSizeMultiplier', 1.3);
  });

  it('secondary is a tonal fill with no border', async () => {
    await renderWithProviders(<Button testID="b" label="Go" variant="secondary" onPress={() => {}} />);
    const s = flat(screen.getByTestId('b').props.style);
    expect(s.backgroundColor).toBe(colors.surface2);
    expect(s.borderWidth).toBeUndefined();
  });

  it('destructiveText is red text on nothing', async () => {
    await renderWithProviders(
      <Button testID="b" label="Delete account" variant="destructiveText" onPress={() => {}} />,
    );
    expect(flat(screen.getByTestId('b').props.style).backgroundColor).toBe('transparent');
    expect(flat(screen.getByText('Delete account').props.style).color).toBe(colors.errorText);
  });

  it('keeps its width while loading: the label stays mounted but invisible, the spinner is centred', async () => {
    await renderWithProviders(<Button testID="b" label="Sign in" loading onPress={() => {}} />);
    expect(screen.getByTestId('b.spinner')).toBeOnTheScreen();
    expect(flat(screen.getByTestId('b.content').props.style).opacity).toBe(0);
  });

  it('disabled is a muted fill with muted text, not a faded button', async () => {
    await renderWithProviders(<Button testID="b" label="Go" disabled onPress={() => {}} />);
    const s = flat(screen.getByTestId('b').props.style);
    expect(s.backgroundColor).toBe(colors.muted);
    expect(s.opacity ?? 1).toBe(1);
    expect(flat(screen.getByText('Go').props.style).color).toBe(colors.mutedForeground);
  });

  it('fires the requested haptic on press and none by default', async () => {
    await renderWithProviders(
      <>
        <Button testID="a" label="Apply" haptic="medium" onPress={() => {}} />
        <Button testID="b" label="Back" onPress={() => {}} />
      </>,
    );
    await fireEvent.press(screen.getByTestId('a'));
    expect(haptic).toHaveBeenCalledWith('medium');
    await fireEvent.press(screen.getByTestId('b'));
    expect(haptic).toHaveBeenCalledTimes(1);
  });

  it('can show a leading icon', async () => {
    await renderWithProviders(
      <Button
        testID="b"
        label="Save job"
        icon={{ ios: 'bookmark', android: 'bookmark' }}
        onPress={() => {}}
      />,
    );
    expect(screen.getByTestId('b.icon')).toBeOnTheScreen();
  });
});
