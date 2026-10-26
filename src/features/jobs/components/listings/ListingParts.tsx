import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Text';
import { type ColorToken, colors, radius, spacing } from '@/theme/tokens';

import { type DeadlineInfo } from '../../logic/deadline';

const DEADLINE_COLOR: Record<DeadlineInfo['kind'], ColorToken> = {
  none: 'mutedForeground',
  open: 'secondaryForeground',
  soon: 'warningText',
  expired: 'errorText',
};

/** Back to Home, like the website's "Back to Opportunities" link. */
export function BackToOpportunities({ testID }: { testID: string }) {
  const router = useRouter();
  return (
    <Button
      testID={testID}
      label="← Back to Opportunities"
      accessibilityLabel="Back to opportunities"
      variant="ghost"
      fullWidth={false}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}

/** Dark hero block of the gov and international screens: title, subtitle and the stat counters. */
export function ListingHero({
  testID,
  title,
  subtitle,
  stats,
}: {
  testID: string;
  title: string;
  subtitle: string;
  stats: { id: string; label: string; value: number }[] | null;
}) {
  return (
    <View style={styles.hero}>
      <AppText variant="title" color="primaryForeground" accessibilityRole="header">
        {title}
      </AppText>
      <AppText variant="body" color="primaryForeground" style={styles.subtitle}>
        {subtitle}
      </AppText>
      {stats && (
        <View testID={`${testID}.stats`} style={styles.stats}>
          {stats.map((s) => (
            <View key={s.id} style={styles.stat}>
              <AppText testID={`${testID}.stat.${s.id}`} variant="heading" color="primaryForeground">
                {String(s.value)}
              </AppText>
              <AppText variant="caption" color="primaryForeground" style={styles.statLabel}>
                {s.label}
              </AppText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** "30 Nov 2026" with the website's colours: amber when 7 days or fewer are left, red when expired. */
export function DeadlineLine({ info }: { info: DeadlineInfo }) {
  return (
    <View style={styles.deadline}>
      <AppText
        variant="caption"
        weight={info.kind === 'soon' || info.kind === 'expired' ? 'semibold' : 'regular'}
        color={DEADLINE_COLOR[info.kind]}
        style={info.kind === 'none' ? styles.italic : undefined}
      >
        {info.text}
      </AppText>
      {info.badge ? (
        <View style={styles.badge}>
          <AppText variant="caption" weight="semibold" color="warningText">
            {info.badge}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

/** Footer line: "Showing n of m ... listings · Managed by ApronHanger". */
export function ListingFooter({
  testID,
  shown,
  total,
  noun,
}: {
  testID: string;
  shown: number;
  total: number;
  noun: string;
}) {
  return (
    <AppText testID={testID} variant="caption" color="mutedForeground" align="center" style={styles.footer}>
      {`Showing ${shown} of ${total} ${noun} listings · Managed by ApronHanger`}
    </AppText>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing['2'],
    backgroundColor: colors.primary,
    borderRadius: radius['2xl'],
    padding: spacing['5'],
  },
  subtitle: { opacity: 0.8 },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['6'],
    marginTop: spacing['3'],
    paddingTop: spacing['3'],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  stat: { gap: 2 },
  statLabel: { opacity: 0.75 },
  deadline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing['2'] },
  italic: { fontStyle: 'italic' },
  badge: {
    borderRadius: radius.full,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing['2'],
    paddingVertical: 2,
  },
  footer: { marginTop: spacing['2'] },
});
