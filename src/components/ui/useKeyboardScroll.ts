import { useEffect, useRef } from 'react';
import { Keyboard, TextInput } from 'react-native';

const GAP = 16;
/**
 * The KeyboardAvoidingView pads on the same keyboard event; measuring right away scrolled against the old layout and
 * the scroll view clamped the offset (Android, found on the phone). Wait for the padded layout first.
 */
export const KEYBOARD_SETTLE_MS = 100;

/** How far to scroll so a field whose bottom is at `fieldBottom` sits GAP above the keyboard top. */
export function keyboardScrollDelta(fieldBottom: number, keyboardTop: number): number {
  return Math.max(0, fieldBottom + GAP - keyboardTop);
}

/**
 * Found on the phone (Task 6): the window resizes for the keyboard but a field focused just before it opens
 * stays hidden behind it. When the keyboard appears, scroll the focused field into view.
 */
export function useKeyboardScroll(scrollTo: (y: number) => void, getOffset: () => number) {
  // Latest callbacks without re-subscribing on every render.
  const callbacks = useRef({ scrollTo, getOffset });
  useEffect(() => {
    callbacks.current = { scrollTo, getOffset };
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = Keyboard.addListener('keyboardDidShow', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const input = TextInput.State.currentlyFocusedInput();
        if (!input) return;
        input.measureInWindow((_x, y, _w, height) => {
          const delta = keyboardScrollDelta(y + height, e.endCoordinates.screenY);
          if (delta > 0) callbacks.current.scrollTo(callbacks.current.getOffset() + delta);
        });
      }, KEYBOARD_SETTLE_MS);
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);
}
