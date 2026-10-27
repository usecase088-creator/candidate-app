// The tinted box every action card sits in (website: CandidateActionCard.tsx colours: indigo, amber, emerald).
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { type ColorToken, colors, radius, spacing } from '@/theme/tokens';

export type CardTone = 'interview' | 'document' | 'positive';

const TONES: Record<CardTone, { bg: ColorToken; fg: ColorToken }> = {
  interview: { bg: 'indigoSoft', fg: 'indigoText' },
  document: { bg: 'amberSoft', fg: 'amberText' },
  positive: { bg: 'emeraldSoft', fg: 'emeraldText' },
};

export function CardFrame({ tone, title, children }: { tone: CardTone; title: string; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <View testID="action.card" style={[styles.card, { backgroundColor: colors[t.bg] }]}>
      <AppText variant="heading" color={t.fg} accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

export function cardTextColor(tone: CardTone): ColorToken {
  return TONES[tone].fg;
}

const styles = StyleSheet.create({
  card: { gap: spacing['3'], borderRadius: radius.xl, padding: spacing['4'] },
});
