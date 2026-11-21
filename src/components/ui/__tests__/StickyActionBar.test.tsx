import { Keyboard, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';
import { act, fireEvent, render, renderHook, renderWithProviders, screen } from '@/test/render';

import { Button } from '../Button';
import { KEYBOARD_HIDE, KEYBOARD_SHOW } from '../keyboardEvents';
import { StickyActionBar, useKeyboardOpen } from '../StickyActionBar';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

type Handler = () => void;
let handlers: Record<string, Handler[]>;
const remove = jest.fn();

beforeEach(() => {
  handlers = {};
  remove.mockClear();
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, handler: Handler) => {
    (handlers[event] ??= []).push(handler);
    return { remove };
  }) as unknown as typeof Keyboard.addListener);
});
afterEach(() => jest.restoreAllMocks());

const emit = (event: string) =>
  act(async () => {
    handlers[event]?.forEach((h) => h());
  });

// D32: the primary CTA sits in a bar pinned above the bottom inset (job details Apply, apply chooser, builder steps).
describe('StickyActionBar', () => {
  it('is a toolbar on a white surface with a hairline top border and 16/12 padding', async () => {
    await renderWithProviders(
      <StickyActionBar testID="job.bar">
        <Button testID="job.apply" label="Apply now" onPress={() => {}} />
      </StickyActionBar>,
    );
    // Not an accessibility element itself (that would swallow its buttons); the role is on the container.
    const bar = screen.getByTestId('job.bar');
    expect(bar.props.accessibilityRole).toBe('toolbar');
    expect(flat(bar.props.style)).toMatchObject({
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
    });
    expect(flat(bar.props.style).boxShadow).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Apply now' })).toBeOnTheScreen();
  });

  it('pads the bottom by the safe-area inset when that is larger than 12', async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <StickyActionBar testID="bar">
          <Button testID="b" label="Continue" onPress={() => {}} />
        </StickyActionBar>
      </SafeAreaProvider>,
    );
    expect(flat(screen.getByTestId('bar').props.style).paddingBottom).toBe(34);
  });

  it('lays two buttons out in one row, sharing the width, 12 apart', async () => {
    await renderWithProviders(
      <StickyActionBar testID="bar">
        <Button testID="back" label="Back" variant="secondary" onPress={() => {}} />
        <Button testID="next" label="Continue" onPress={() => {}} />
      </StickyActionBar>,
    );
    const row = screen.getByTestId('bar.actions');
    expect(flat(row.props.style)).toMatchObject({ flexDirection: 'row', gap: 12 });
    const slots = [screen.getByTestId('bar.action.0'), screen.getByTestId('bar.action.1')];
    for (const slot of slots) expect(flat(slot.props.style)).toMatchObject({ flex: 1 });
    expect(screen.queryByTestId('bar.action.2')).toBeNull();
  });

  it('shows a leading slot capped at half the width', async () => {
    await renderWithProviders(
      <StickyActionBar testID="bar" leading={<Text>Rs 45,000 / month</Text>}>
        <Button testID="apply" label="Apply now" onPress={() => {}} />
      </StickyActionBar>,
    );
    expect(screen.getByText('Rs 45,000 / month')).toBeOnTheScreen();
    expect(flat(screen.getByTestId('bar.leading').props.style)).toMatchObject({ maxWidth: '50%' });
  });

  it('hides while the keyboard is open and comes back when it closes', async () => {
    await renderWithProviders(
      <StickyActionBar testID="bar">
        <Button testID="b" label="Continue" onPress={() => {}} />
      </StickyActionBar>,
    );
    expect(screen.getByTestId('bar')).toBeOnTheScreen();
    await emit(KEYBOARD_SHOW);
    expect(screen.queryByTestId('bar')).toBeNull();
    await emit(KEYBOARD_HIDE);
    expect(screen.getByTestId('bar')).toBeOnTheScreen();
  });

  it('stays while the keyboard is open when hideWhenKeyboardOpen is false', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <StickyActionBar testID="bar" hideWhenKeyboardOpen={false}>
        <Button testID="b" label="Continue" onPress={onPress} />
      </StickyActionBar>,
    );
    await emit(KEYBOARD_SHOW);
    await fireEvent.press(screen.getByTestId('b'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('removes its keyboard listeners on unmount', async () => {
    const { unmount } = await renderWithProviders(
      <StickyActionBar testID="bar">
        <Button testID="b" label="Continue" onPress={() => {}} />
      </StickyActionBar>,
    );
    expect(Keyboard.addListener).toHaveBeenCalledWith(KEYBOARD_SHOW, expect.any(Function));
    expect(Keyboard.addListener).toHaveBeenCalledWith(KEYBOARD_HIDE, expect.any(Function));
    await unmount();
    expect(remove).toHaveBeenCalledTimes(2);
  });
});

describe('useKeyboardOpen', () => {
  it('starts closed and follows the show and hide events', async () => {
    const { result } = await renderHook(() => useKeyboardOpen());
    expect(result.current).toBe(false);
    await emit(KEYBOARD_SHOW);
    expect(result.current).toBe(true);
    await emit(KEYBOARD_HIDE);
    expect(result.current).toBe(false);
  });
});
