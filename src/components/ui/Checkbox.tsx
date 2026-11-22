import type { ReactNode } from 'react';
import { type AccessibilityActionEvent, StyleSheet, View } from 'react-native';

import { colors, fontSizes, radius, spacing } from '@/theme/tokens';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { AppText } from './Text';

export type CheckboxProps = {
  testID: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Spoken name; the visible label can contain links, so screen readers get a plain version. */
  accessibilityLabel: string;
  children: ReactNode;
  invalid?: boolean;
  /**
   * A link inside the visible label (Terms, Privacy). The row is one accessible element, so screen readers cannot
   * focus the nested link: it is offered as a custom action ("Open Terms & Conditions") next to ticking the box.
   */
  linkAction?: { label: string; onOpen: () => void };
};

const BOX = 22;
const CHECK_SIZE = 14;
const CHECK = { ios: 'checkmark', android: 'check', web: 'check' } as const;

/**
 * D32 consent checkbox (signup, profile builder): 22-pt box with radius 6, brand fill and an Icon check.
 * The whole row is the touch target; it does not shrink on press (only the opacity dips) and ticks on change.
 */
export function Checkbox({
  testID,
  checked,
  onChange,
  accessibilityLabel,
  children,
  invalid,
  linkAction,
}: CheckboxProps) {
  const toggle = () => onChange(!checked);
  const a11yActions = linkAction
    ? {
        accessibilityActions: [{ name: 'activate' }, { name: 'openLink', label: linkAction.label }],
        onAccessibilityAction: (e: AccessibilityActionEvent) => {
          if (e.nativeEvent.actionName === 'openLink') linkAction.onOpen();
          else if (e.nativeEvent.actionName === 'activate') toggle();
        },
      }
    : {};
  return (
    <PressableScale
      testID={testID}
      haptic="selection"
      pressScale={1}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked }}
      {...a11yActions}
      onPress={toggle}
      style={styles.row}
    >
      <View
        testID={`${testID}.box`}
        style={[
          styles.box,
          checked && styles.checked,
          invalid && !checked && { borderColor: colors.destructive },
        ]}
      >
        {checked ? (
          <Icon testID={`${testID}.check`} name={CHECK} size={CHECK_SIZE} tintColor={colors.surface} />
        ) : null}
      </View>
      <View style={styles.label}>
        {typeof children === 'string' ? <AppText variant="body">{children}</AppText> : children}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing['3'],
    alignItems: 'flex-start',
    paddingVertical: spacing['2'],
  },
  box: {
    width: BOX,
    height: BOX,
    // Centres the box on the first line of body text.
    marginTop: (fontSizes.base.lineHeight - BOX) / 2,
    borderWidth: 1.5,
    // R3 a11y P2-5: the outline is the whole control at rest: 3:1.
    borderColor: colors.controlBorder,
    borderRadius: radius.sm - 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.brand, borderColor: colors.brand },
  label: { flex: 1 },
});
