// The coloured status label (website: statusPillClass). Colours come from the theme; the group comes from the status.
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { type ColorToken, colors, radius, spacing } from '@/theme/tokens';

import { statusLabel, type StatusTone, statusTone } from '../logic/status';

const TONES: Record<StatusTone, { bg: ColorToken; fg: ColorToken; border: ColorToken }> = {
  danger: { bg: 'destructiveSoft', fg: 'errorText', border: 'destructiveSoft' },
  interview: { bg: 'indigoSoft', fg: 'indigoText', border: 'indigoSoft' },
  document: { bg: 'amberSoft', fg: 'amberText', border: 'amberSoft' },
  positive: { bg: 'emeraldSoft', fg: 'emeraldText', border: 'emeraldSoft' },
  reviewed: { bg: 'skySoft', fg: 'skyText', border: 'skySoft' },
  applied: { bg: 'muted', fg: 'foreground', border: 'border' },
  muted: { bg: 'muted', fg: 'mutedForeground', border: 'border' },
};

export function StatusPill({ testID, status }: { testID?: string; status: string }) {
  const tone = TONES[statusTone(status)];
  const label = statusLabel(status);
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`Status: ${label}`}
      style={[styles.pill, { backgroundColor: colors[tone.bg], borderColor: colors[tone.border] }]}
    >
      <AppText variant="caption" weight="semibold" color={tone.fg}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['1'],
  },
});
