import type { SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { type ColorToken, colors, radius, spacing } from '@/theme/tokens';

import { Icon } from './Icon';
import { AppText } from './Text';

export type PillTone = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'brand';

/** D32: each tone is a soft fill + an AA text colour from tokens. Exported so rows and panels can reuse the pairs. */
export const pillTones: Record<PillTone, { bg: ColorToken; fg: ColorToken }> = {
  neutral: { bg: 'muted', fg: 'mutedForeground' },
  info: { bg: 'skySoft', fg: 'skyText' },
  success: { bg: 'successSoft', fg: 'successText' },
  warning: { bg: 'amberSoft', fg: 'amberText' },
  error: { bg: 'destructiveSoft', fg: 'errorText' },
  // R3 a11y P2-2: text on brandSoft needs brandText (brand is 4.31:1 there).
  brand: { bg: 'brandSoft', fg: 'brandText' },
};

export type PillProps = {
  testID: string;
  label: string;
  tone: PillTone;
  /** Optional 12-pt leading icon, drawn in the tone's text colour. */
  icon?: SymbolViewProps['name'];
  /** Lines up digits (match %, counts). */
  tabular?: boolean;
};

const ICON_SIZE = 12;

/** 22-pt status pill (application status, verified, match %). Not pressable; reads as text. */
export function Pill({ testID, label, tone, icon, tabular }: PillProps) {
  const { bg, fg } = pillTones[tone];
  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[styles.pill, { backgroundColor: colors[bg] }]}
    >
      {icon ? <Icon testID={`${testID}.icon`} name={icon} size={ICON_SIZE} tintColor={colors[fg]} /> : null}
      <AppText testID={`${testID}.label`} variant="caption" color={fg} tabular={tabular} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing['1'],
    minHeight: 22,
    paddingHorizontal: spacing['2'],
    borderRadius: radius.full,
  },
});
