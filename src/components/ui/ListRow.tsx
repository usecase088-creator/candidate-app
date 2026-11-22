import { isValidElement, type ReactNode } from 'react';
import { type AccessibilityRole, type AccessibilityState, StyleSheet, View } from 'react-native';

import type { HapticKind } from '@/lib/haptics';
import { colors, spacing } from '@/theme/tokens';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { AppText } from './Text';

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as const;

export type ListRowProps = {
  testID: string;
  title: string;
  subtitle?: string;
  /** Icon or logo slot, 24-40 wide. */
  leading?: ReactNode;
  /** Right edge: a chevron (default when pressable), nothing, or a custom node such as a switch. */
  trailing?: 'chevron' | 'none' | ReactNode;
  /** Right-aligned muted text before the chevron ("English", "+91 ..."). */
  value?: string;
  /** Title in `errorText` (Delete account, Sign out). */
  destructive?: boolean;
  onPress?: () => void;
  /** Meaning of the press (D32 haptic map). Plain navigation taps stay silent. */
  haptic?: HapticKind;
  /** Default: the title, plus the subtitle and the value when shown. */
  accessibilityLabel?: string;
  /** Pressable rows: default `button`. */
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityHint?: string;
  /** `body` (15/500) for settings-style rows, `rowTitle` (16/600) for content rows. */
  titleVariant?: 'body' | 'rowTitle';
  titleNumberOfLines?: number;
  subtitleNumberOfLines?: number;
};

/**
 * D32 list row: 52-72 pt, leading slot, title + optional subtitle, value / chevron / custom trailing.
 * Pressable rows dim through PressableScale without shrinking; static rows (no onPress) are a plain View.
 */
export function ListRow({
  testID,
  title,
  subtitle,
  leading,
  trailing,
  value,
  destructive,
  onPress,
  haptic,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  accessibilityHint,
  titleVariant = 'body',
  titleNumberOfLines = 2,
  subtitleNumberOfLines = 2,
}: ListRowProps) {
  const resolvedTrailing = trailing ?? (onPress ? 'chevron' : 'none');
  const label = accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ');

  const content = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.text}>
        <AppText
          testID={`${testID}.title`}
          variant={titleVariant}
          weight={titleVariant === 'body' ? 'medium' : undefined}
          color={destructive ? 'errorText' : 'foreground'}
          numberOfLines={titleNumberOfLines}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText
            testID={`${testID}.subtitle`}
            variant="secondary"
            color="mutedForeground"
            numberOfLines={subtitleNumberOfLines}
          >
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText testID={`${testID}.value`} color="mutedForeground" numberOfLines={1} style={styles.value}>
          {value}
        </AppText>
      ) : null}
      {resolvedTrailing === 'chevron' ? (
        <Icon testID={`${testID}.chevron`} name={CHEVRON} size={20} tintColor={colors.mutedForeground} />
      ) : isValidElement(resolvedTrailing) ? (
        resolvedTrailing
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        testID={testID}
        accessible
        accessibilityLabel={label}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
        accessibilityHint={accessibilityHint}
        style={styles.row}
      >
        {content}
      </View>
    );
  }

  return (
    <PressableScale
      testID={testID}
      accessibilityLabel={label}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      accessibilityHint={accessibilityHint}
      haptic={haptic}
      pressScale={1}
      onPress={onPress}
      style={styles.row}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    minHeight: 52,
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
  },
  leading: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: spacing['0.5'] },
  value: { flexShrink: 1, maxWidth: '45%', textAlign: 'right' },
});
