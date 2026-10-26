import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Job } from '@/api/schemas/jobs';
import { AppText } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

import { formatLPA } from '../logic/format';
import type { MatchedJob } from '../logic/match';
import { HospitalLogo } from './HospitalLogo';
import { MatchRing } from './MatchRing';
import { VerifiedBadge } from './VerifiedBadge';

type Props = {
  jobs: MatchedJob[];
  /** Show "Unlock personalised recommendations" when there is nothing to recommend and the profile is thin. */
  showPrompt: boolean;
  onOpen: (job: Job) => void;
};

/**
 * Website RecommendedRail. The prompt's "Build my CV" button comes with the profile builder (Phase 4); until then the
 * card only tells the candidate what completing the profile unlocks.
 */
export function RecommendedRail({ jobs, showPrompt, onOpen }: Props) {
  if (jobs.length === 0) {
    if (!showPrompt) return null;
    return (
      <View testID="recommended.prompt" style={styles.prompt}>
        <AppText variant="bodyLg" weight="semibold" align="center">
          Unlock personalised recommendations
        </AppText>
        <AppText color="mutedForeground" align="center">
          Complete your profile and we&apos;ll match you to the best roles instantly.
        </AppText>
      </View>
    );
  }

  return (
    <View testID="recommended.rail" style={styles.section}>
      <View style={styles.tag}>
        <SymbolView
          name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
          tintColor={colors.primary}
          size={12}
        />
        <AppText variant="caption" weight="medium" color="primary">
          Matched to your profile
        </AppText>
      </View>
      <AppText variant="heading">Recommended for you</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {jobs.map((j) => (
          <Pressable
            key={j.id}
            testID={`recommended.job.${j.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${j.role} at ${j.hospital}, ${j.matchPercent}% match`}
            onPress={() => onOpen(j)}
            style={styles.card}
          >
            <View style={styles.cardTop}>
              <HospitalLogo uri={j.hospitalLogoUrl} size={36} />
              <MatchRing value={j.matchPercent} size={36} />
            </View>
            <View style={styles.hospital}>
              <AppText variant="caption" weight="semibold" style={styles.flex}>
                {j.hospital}
              </AppText>
              {j.hospitalVerified ? <VerifiedBadge /> : null}
            </View>
            <AppText weight="semibold" numberOfLines={2}>
              {j.role}
            </AppText>
            <AppText variant="caption" color="mutedForeground">
              {j.city} · {formatLPA(j.salaryMin, j.salaryMax)}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing['2'],
    backgroundColor: colors.surface2,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing['4'],
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing['1'],
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing['2'],
    paddingVertical: 2,
  },
  row: { gap: spacing['3'], paddingVertical: spacing['1'] },
  card: {
    width: 260,
    gap: spacing['2'],
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing['4'],
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hospital: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing['2'] },
  flex: { flexShrink: 1 },
  prompt: {
    gap: spacing['2'],
    alignItems: 'center',
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.brandSoft,
    padding: spacing['6'],
  },
});
