import { SymbolView } from 'expo-symbols';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Job } from '@/api/schemas/jobs';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

import { formatExp, formatLPA, postedLabel } from '../logic/format';
import { HospitalLogo } from './HospitalLogo';
import { MatchRing } from './MatchRing';
import { SaveButton } from './SaveButton';
import { VerifiedBadge } from './VerifiedBadge';

type Props = {
  job: Job;
  saved: boolean;
  onToggleSave: (job: Job) => void;
  onOpen: (job: Job) => void;
};

/**
 * Website JobCard. The card itself is not one big button: a button that holds other buttons hides them from
 * TalkBack and VoiceOver. The title block is the tap target for "open", next to the separate Save and
 * View Details buttons. testIDs: `job.card.{id}`, `job.title.{id}`, `job.save.{id}`, `job.open.{id}`.
 */
function JobCardView({ job, saved, onToggleSave, onOpen }: Props) {
  return (
    <View testID={`job.card.${job.id}`} style={styles.card}>
      <View style={styles.top}>
        {/* Touch only: the accessible target for "open" is the title block below. */}
        <Pressable accessible={false} onPress={() => onOpen(job)} style={styles.topInfo}>
          <HospitalLogo uri={job.hospitalLogoUrl} />
          <View style={styles.hospital}>
            <AppText variant="label" weight="semibold">
              {job.hospital}
            </AppText>
            {job.hospitalVerified ? <VerifiedBadge /> : null}
            <View style={styles.location}>
              <SymbolView
                name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}
                tintColor={colors.mutedForeground}
                size={12}
              />
              <AppText variant="caption" color="mutedForeground" style={styles.flex}>
                {job.location}
              </AppText>
            </View>
          </View>
        </Pressable>
        <SaveButton testID={`job.save.${job.id}`} saved={saved} onPress={() => onToggleSave(job)} />
      </View>

      <Pressable
        testID={`job.title.${job.id}`}
        accessibilityRole="button"
        accessibilityLabel={`View ${job.role} at ${job.hospital}`}
        onPress={() => onOpen(job)}
      >
        <AppText variant="bodyLg" weight="semibold" style={styles.role}>
          {job.role}
        </AppText>
        <AppText variant="caption" color="mutedForeground">
          {job.specialty}
        </AppText>
        <View style={styles.pills}>
          <Pill text={job.type} />
          <Pill text={formatExp(job.experienceMin, job.experienceMax)} />
          <Pill text={formatLPA(job.salaryMin, job.salaryMax)} />
        </View>
      </Pressable>

      <View style={styles.footer}>
        <AppText variant="caption" color="mutedForeground">
          {postedLabel(job.postedDays)}
        </AppText>
        <View style={styles.actions}>
          {job.matchPercent != null ? <MatchRing value={job.matchPercent} size={36} /> : null}
          <Button
            testID={`job.open.${job.id}`}
            label="View Details"
            fullWidth={false}
            accessibilityLabel={`View Details, ${job.role}`}
            onPress={() => onOpen(job)}
          />
        </View>
      </View>
    </View>
  );
}

export const JobCard = memo(JobCardView);

function Pill({ text }: { text: string }) {
  return (
    <View style={styles.pill}>
      <AppText variant="caption" weight="medium" color="secondaryForeground">
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing['5'],
    marginBottom: spacing['4'],
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['3'] },
  topInfo: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing['3'] },
  hospital: { flex: 1, gap: spacing['1'] },
  location: { flexDirection: 'row', alignItems: 'center', gap: spacing['1'] },
  flex: { flexShrink: 1 },
  role: { marginTop: spacing['4'] },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'], marginTop: spacing['4'] },
  pill: {
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['1'],
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing['3'],
    marginTop: spacing['5'],
    paddingTop: spacing['4'],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
});
