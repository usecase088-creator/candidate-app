import { StyleSheet } from 'react-native';

import { haptic } from '@/lib/haptics';
import { colors, radius } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { Stepper } from '../Stepper';

jest.mock('@/lib/haptics', () => ({ haptic: jest.fn() }));

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

afterEach(() => jest.clearAllMocks());

function setup(value: number, onChange = jest.fn()) {
  return renderWithProviders(
    <Stepper
      testID="filters.salary"
      label="Minimum salary"
      value={value}
      min={0}
      max={10}
      step={1}
      display={`${value} LPA`}
      onChange={onChange}
    />,
  );
}

// D32: a compact 36-pt pill (surface2) with two 44 x 36 icon buttons and a tabular value.
describe('Stepper (D32)', () => {
  it('is a 36-pt surface2 pill', async () => {
    await setup(5);
    expect(flat(screen.getByTestId('filters.salary').props.style)).toMatchObject({
      minHeight: 36,
      borderRadius: radius.full,
      backgroundColor: colors.surface2,
    });
  });

  it('has 44 x 36 icon buttons with 20-pt minus and plus icons (no glyph text)', async () => {
    await setup(5);
    const minus = screen.getByTestId('filters.salary.minus');
    expect(flat(minus.props.style)).toMatchObject({ width: 44, height: 36 });
    expect(flat(screen.getByTestId('filters.salary.minus.icon').props.style)).toMatchObject({
      width: 20,
      height: 20,
    });
    // expo-symbols resolves `{ ios, android, web }` to the running platform's name (iOS under jest-expo).
    expect(screen.getByTestId('filters.salary.plus.icon')).toHaveProp('name', 'plus');
    expect(screen.getByTestId('filters.salary.minus.icon')).toHaveProp('name', 'minus');
    expect(screen.queryByText('−')).toBeNull();
    expect(screen.queryByText('+')).toBeNull();
  });

  it('shows the value at 15/600 with tabular digits', async () => {
    await setup(5);
    const value = screen.getByTestId('filters.salary.value');
    expect(value).toHaveTextContent('5 LPA');
    expect(flat(value.props.style)).toMatchObject({
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      fontVariant: ['tabular-nums'],
    });
    expect(value).toHaveProp('accessibilityValue', { min: 0, max: 10, now: 5, text: '5 LPA' });
  });

  it('steps within min and max with a selection haptic', async () => {
    const onChange = jest.fn();
    await setup(5, onChange);
    await fireEvent.press(screen.getByRole('button', { name: 'Increase Minimum salary' }));
    expect(onChange).toHaveBeenCalledWith(6);
    expect(haptic).toHaveBeenCalledWith('selection');
    await fireEvent.press(screen.getByRole('button', { name: 'Decrease Minimum salary' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('disables the button at the limit and greys its icon instead of fading the button', async () => {
    const onChange = jest.fn();
    await setup(0, onChange);
    const minus = screen.getByTestId('filters.salary.minus');
    expect(minus).toBeDisabled();
    await fireEvent.press(minus);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('filters.salary.minus.icon')).toHaveProp('tintColor', colors.mutedForeground);
    expect(screen.getByTestId('filters.salary.plus.icon')).toHaveProp('tintColor', colors.foreground);
    expect(flat(minus.props.style).opacity ?? 1).toBe(1);
  });
});
