import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { Job } from '@/api/schemas/jobs';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LogoTile } from '@/components/ui/LogoTile';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { AppText } from '@/components/ui/Text';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

import { formatLPA } from '../logic/format';
import type { MatchedJob } from '../logic/match';
import { MatchRing } from './MatchRing';

const SPARKLES = { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as const;
const SEAL = { ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' } as const;
const CARD_WIDTH = 240;

type Props = {
  jobs: MatchedJob[];
  /** Show "Unlock personalised recommendations" when there is nothing to recommend and the profile is thin. */
  showPrompt: boolean;
  onOpen: (job: Job) => void;
};

/**
 * Website RecommendedRail. D32: no panel around it; a small brand "Matched to your profile" pill and the section
 * header, then borderless white cards that bleed to the screen edges, each with the logo, the match as an animated
 * ring, the role, the hospital with its seal right after the name, and one meta line. A single card takes the full
 * content width. The prompt's "Build my CV" button opens the profile form.
 */
export function RecommendedRail({ jobs, showPrompt, onOpen }: Props) {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  // One card alone would leave a third of the row empty: it takes the content width (16-pt margins) instead.
  const cardWidth = jobs.length === 1 ? windowWidth - spacing['4'] * 2 : CARD_WIDTH;
  if (jobs.length === 0) {
    if (!showPrompt) return null;
    return (
      <View testID="recommended.prompt" style={styles.prompt}>
        <Icon name={SPARKLES} tintColor={colors.brand} size={22} />
        <AppText variant="heading" align="center">
          Unlock personalised recommendations
        </AppText>
        <AppText variant="secondary" color="mutedForeground" align="center">
          Complete your profile and we&apos;ll match you to the best roles instantly.
        </AppText>
        <Button
          testID="recommended.build"
          label="Build my CV"
          size="md"
          fullWidth={false}
          haptic="light"
          onPress={() => router.push('/profile-builder')}
        />
      </View>
    );
  }

  return (
    <View testID="recommended.rail" style={styles.section}>
      {/* Website order: the tag, then the heading (side by side they wrapped at 320 pt). */}
      <View style={styles.heading}>
        <Pill testID="recommended.tag" label="Matched to your profile" tone="brand" icon={SPARKLES} />
        <AppText variant="heading">Recommended for you</AppText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {jobs.map((j) => (
          <PressableScale
            key={j.id}
            testID={`recommended.job.${j.id}`}
            accessibilityLabel={`${j.role} at ${j.hospital}, ${j.matchPercent}% match`}
            onPress={() => onOpen(j)}
            style={[styles.card, { width: cardWidth }]}
          >
            <View style={styles.cardTop}>
              <LogoTile
                testID={`recommended.logo.${j.id}`}
                name={j.hospital}
                uri={j.hospitalLogoUrl}
                size={40}
              />
              <MatchRing testID={`recommended.match.${j.id}`} value={j.matchPercent} size={36} />
            </View>
            <AppText variant="rowTitle" numberOfLines={2}>
              {j.role}
            </AppText>
            <View style={styles.hospital}>
              <AppText variant="secondary" numberOfLines={1} style={styles.shrink}>
                {j.hospital}
              </AppText>
              {j.hospitalVerified ? (
                <Icon
                  testID={`recommended.verified.${j.id}`}
                  name={SEAL}
                  tintColor={colors.brand}
                  size={14}
                />
              ) : null}
            </View>
            <AppText variant="secondary" color="mutedForeground" numberOfLines={1} tabular>
              {j.city} · {formatLPA(j.salaryMin, j.salaryMax)}
            </AppText>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: spacing['5'] },
  heading: {
    gap: spacing['1'],
    paddingHorizontal: spacing['4'],
    paddingBottom: spacing['2'],
  },
  shrink: { flexShrink: 1 },
  row: { gap: spacing['3'], paddingHorizontal: spacing['4'], paddingVertical: spacing['2'] },
  card: {
    gap: spacing['1'],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing['3'],
    boxShadow: shadows.soft,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing['2'],
  },
  hospital: { flexDirection: 'row', alignItems: 'center', gap: spacing['1'] },
  prompt: {
    gap: spacing['2'],
    alignItems: 'center',
    marginHorizontal: spacing['4'],
    marginTop: spacing['5'],
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    padding: spacing['5'],
  },
});
