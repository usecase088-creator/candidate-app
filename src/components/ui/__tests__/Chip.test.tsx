import { StyleSheet } from 'react-native';

import { haptic } from '@/lib/haptics';
import { colors, radius } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { Chip } from '../Chip';

jest.mock('@/lib/haptics', () => ({ haptic: jest.fn() }));

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};
const verticalSlop = (slop: unknown) =>
  typeof slop === 'number' ? slop : ((slop as { top?: number } | undefined)?.top ?? 0);

afterEach(() => jest.clearAllMocks());

// D32: 32-pt tonal pill, 13/500, brandSoft + brand when selected, hit area padded to 44, selection haptic.
describe('Chip (D32)', () => {
  it('is a 32-pt full-radius pill with 12-pt side padding and no border when idle', async () => {
    await renderWithProviders(<Chip testID="c" label="Nursing" selected={false} onPress={() => {}} />);
    const style = flat(screen.getByTestId('c').props.style);
    expect(style).toMatchObject({
      minHeight: 32,
      borderRadius: radius.full,
      paddingHorizontal: 12,
      // Was surface2 (invisible on the canvas). R2 issue 2: the tonal `fill`.
      backgroundColor: colors.fill,
    });
    expect(style.borderWidth ?? 0).toBe(0);
  });

  it('labels in the secondary ramp (13/18) at medium weight, foreground when idle', async () => {
    await renderWithProviders(<Chip testID="c" label="Nursing" selected={false} onPress={() => {}} />);
    expect(flat(screen.getByTestId('c.label').props.style)).toMatchObject({
      fontSize: 13,
      lineHeight: 18,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    });
  });

  it('selected: brandSoft fill, 1.5-px brand border, brand text, and says so', async () => {
    await renderWithProviders(<Chip testID="c" label="Nursing" selected onPress={() => {}} />);
    const chip = screen.getByTestId('c');
    expect(flat(chip.props.style)).toMatchObject({
      backgroundColor: colors.brandSoft,
      borderWidth: 1.5,
      borderColor: colors.brand,
    });
    expect(flat(screen.getByTestId('c.label').props.style).color).toBe(colors.brand);
    expect(chip).toBeSelected();
    expect(screen.getByRole('button', { name: 'Nursing', selected: true })).toBeOnTheScreen();
  });

  it('presses with a selection haptic and a hit area that reaches 44', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Chip testID="c" label="Nursing" selected={false} onPress={onPress} />);
    const chip = screen.getByTestId('c');
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(haptic).toHaveBeenCalledWith('selection');
    expect(32 + verticalSlop(chip.props.hitSlop) * 2).toBeGreaterThanOrEqual(44);
  });

  it('keeps a custom spoken label', async () => {
    await renderWithProviders(
      <Chip testID="c" label="All" selected={false} onPress={() => {}} accessibilityLabel="All categories" />,
    );
    expect(screen.getByRole('button', { name: 'All categories' })).toBeOnTheScreen();
  });

  it('draws an optional 14-pt leading icon in the text colour', async () => {
    await renderWithProviders(
      <Chip
        testID="c"
        label="Remote"
        selected
        onPress={() => {}}
        icon={{ ios: 'location', android: 'location_on', web: 'location_on' }}
      />,
    );
    const icon = screen.getByTestId('c.icon');
    expect(icon).toHaveProp('tintColor', colors.brand);
    expect(flat(icon.props.style)).toMatchObject({ width: 14, height: 14 });
  });

  it('has no icon or remove button unless asked', async () => {
    await renderWithProviders(<Chip testID="c" label="Remote" selected={false} onPress={() => {}} />);
    expect(screen.queryByTestId('c.icon')).toBeNull();
    expect(screen.queryByTestId('c.remove')).toBeNull();
  });

  it('offers a trailing remove button with its own 44-pt hit area, without firing the chip', async () => {
    const onPress = jest.fn();
    const onRemove = jest.fn();
    await renderWithProviders(
      <Chip testID="c" label="Mumbai" selected onPress={onPress} onRemove={onRemove} />,
    );
    const remove = screen.getByRole('button', { name: 'Remove Mumbai' });
    expect(remove).toBe(screen.getByTestId('c.remove'));
    expect(flat(screen.getByTestId('c.remove.icon').props.style)).toMatchObject({ width: 16, height: 16 });
    expect(16 + verticalSlop(remove.props.hitSlop) * 2).toBeGreaterThanOrEqual(44);
    await fireEvent.press(remove);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });
});
