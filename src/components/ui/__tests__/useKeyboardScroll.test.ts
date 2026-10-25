import { Keyboard, TextInput } from 'react-native';

import { renderHook } from '@/test/render';

import { keyboardScrollDelta, useKeyboardScroll } from '../useKeyboardScroll';

describe('keyboardScrollDelta', () => {
  it('is 0 when the field is above the keyboard with room to spare', () => {
    expect(keyboardScrollDelta(500, 600)).toBe(0);
  });

  it('scrolls the field bottom plus a 16 pt gap above the keyboard', () => {
    expect(keyboardScrollDelta(700, 600)).toBe(116);
  });

  it('also scrolls when the field is just touching the keyboard', () => {
    expect(keyboardScrollDelta(595, 600)).toBe(11);
  });
});

describe('useKeyboardScroll', () => {
  type ShowEvent = { endCoordinates: { screenY: number } };
  let emitShow: (e: ShowEvent) => void;
  const remove = jest.fn();

  beforeEach(() => {
    remove.mockClear();
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      _event: string,
      handler: (e: ShowEvent) => void,
    ) => {
      emitShow = handler;
      return { remove };
    }) as unknown as typeof Keyboard.addListener);
  });

  function focusFieldAt(y: number, height: number) {
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue({
      measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => cb(0, y, 300, height),
    } as unknown as ReturnType<typeof TextInput.State.currentlyFocusedInput>);
  }

  it('scrolls the focused field above the keyboard, from the current offset', async () => {
    const scrollTo = jest.fn();
    await renderHook(() => useKeyboardScroll(scrollTo, () => 40));
    focusFieldAt(700, 48);
    emitShow({ endCoordinates: { screenY: 600 } });
    expect(scrollTo).toHaveBeenCalledWith(40 + 748 + 16 - 600);
  });

  it('does nothing when the field is already visible', async () => {
    const scrollTo = jest.fn();
    await renderHook(() => useKeyboardScroll(scrollTo, () => 0));
    focusFieldAt(100, 48);
    emitShow({ endCoordinates: { screenY: 600 } });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does nothing when no field has focus', async () => {
    const scrollTo = jest.fn();
    await renderHook(() => useKeyboardScroll(scrollTo, () => 0));
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue(null as never);
    emitShow({ endCoordinates: { screenY: 600 } });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('listens for keyboardDidShow and stops on unmount', async () => {
    const { unmount } = await renderHook(() => useKeyboardScroll(jest.fn(), () => 0));
    expect(Keyboard.addListener).toHaveBeenCalledWith('keyboardDidShow', expect.any(Function));
    await unmount();
    expect(remove).toHaveBeenCalled();
  });
});
