import { Children, type ReactNode, useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/tokens';

import { KEYBOARD_HIDE, KEYBOARD_SHOW } from './keyboardEvents';

/** True while the on-screen keyboard is up (platform event names from keyboardEvents.*). */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(() => Keyboard.isVisible?.() ?? false);
  useEffect(() => {
    const show = Keyboard.addListener(KEYBOARD_SHOW, () => setOpen(true));
    const hide = Keyboard.addListener(KEYBOARD_HIDE, () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

export type StickyActionBarProps = {
  testID: string;
  /** One or two Buttons. One stretches across; two share the width equally. */
  children: ReactNode;
  /** Text on the left of the actions (e.g. the salary on job details); at most half the width. */
  leading?: ReactNode;
  /** Hide the bar while the keyboard is up, so it never floats above a form's keyboard. Default true. */
  hideWhenKeyboardOpen?: boolean;
};

/**
 * D32: the primary CTA pinned to the bottom of a screen, above the home indicator / gesture bar
 * (job details Apply, apply chooser, builder Back/Continue). White surface, hairline top border, no shadow.
 */
export function StickyActionBar({ testID, children, leading, hideWhenKeyboardOpen = true }: StickyActionBarProps) {
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardOpen();
  if (hideWhenKeyboardOpen && keyboardOpen) return null;

  const actions = Children.toArray(children);
  return (
    <View
      testID={testID}
      accessibilityRole="toolbar"
      style={[styles.bar, { paddingBottom: Math.max(spacing['3'], insets.bottom) }]}
    >
      {leading ? (
        <View testID={`${testID}.leading`} style={styles.leading}>
          {leading}
        </View>
      ) : null}
      <View testID={`${testID}.actions`} style={styles.actions}>
        {actions.map((action, i) => (
          <View key={i} testID={`${testID}.action.${i}`} style={styles.slot}>
            {action}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
    paddingHorizontal: spacing['4'],
    paddingTop: spacing['3'],
  },
  leading: { maxWidth: '50%', flexShrink: 1 },
  actions: { flex: 1, flexDirection: 'row', gap: spacing['3'] },
  slot: { flex: 1 },
});
