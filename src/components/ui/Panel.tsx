import type { SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { type ColorToken, colors, radius, spacing } from '@/theme/tokens';

import { Icon } from './Icon';
import { AppText } from './Text';

export type PanelTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

/** Tone = fill + icon colour only. Title and body stay `foreground` so the text reads on every tint. */
const TONES: Record<PanelTone, { fill: ColorToken; icon: ColorToken }> = {
  neutral: { fill: 'muted', icon: 'foreground' },
  info: { fill: 'skySoft', icon: 'skyText' },
  success: { fill: 'successSoft', icon: 'successText' },
  warning: { fill: 'amberSoft', icon: 'amberText' },
  error: { fill: 'destructiveSoft', icon: 'errorText' },
};

export type PanelProps = {
  testID: string;
  tone: PanelTone;
  /** 20-pt icon drawn in the tone colour; it carries the meaning, the text does not. */
  icon?: SymbolViewProps['name'];
  title: string;
  /** Body: AppText `body` in `foreground`, never coloured text. */
  children: ReactNode;
  /** Buttons row at the bottom (gap 8). */
  actions?: ReactNode;
};

/** D32: one flat tinted information panel (replaces the yellow / lavender / green boxes on application details). */
export function Panel({ testID, tone, icon, title, children, actions }: PanelProps) {
  const t = TONES[tone];
  return (
    <View testID={testID} accessible={false} style={[styles.box, { backgroundColor: colors[t.fill] }]}>
      <View style={styles.header}>
        {icon ? (
          <Icon testID={`${testID}.icon`} name={icon} size={20} tintColor={colors[t.icon]} style={styles.icon} />
        ) : null}
        <AppText testID={`${testID}.title`} variant="heading" color="foreground" style={styles.title}>
          {title}
        </AppText>
      </View>
      <View testID={`${testID}.body`}>{children}</View>
      {actions ? (
        <View testID={`${testID}.actions`} style={styles.actions}>
          {actions}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, padding: spacing['4'], gap: spacing['2'] },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['2'] },
  // Centres a 20-pt icon on the 22-pt first line of the title.
  icon: { marginTop: 1 },
  title: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing['2'] },
});
