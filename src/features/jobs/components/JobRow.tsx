import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Job } from '@/api/schemas/jobs';
import { Icon } from '@/components/ui/Icon';
import { LogoTile } from '@/components/ui/LogoTile';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { AppText } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';

import { formatExp, formatLPA, postedLabel } from '../logic/format';
import { SaveButton } from './SaveButton';

type Props = {
  job: Job;
  saved: boolean;
  onToggleSave: (job: Job) => void;
  onOpen: (job: Job) => void;
};

/**
 * D32 job row (replaces the 300-pt JobCard in Home, Search and Saved): logo, role, hospital with an inline verified
 * check, one meta line, salary in tabular figures and the match as a pill. About 116 pt, so 4-5 jobs fit a small
 * screen. The whole row is one button; the bookmark is a sibling target, never nested inside the row button
 * (a button inside a button hides it from TalkBack and VoiceOver).
 * testIDs kept from JobCard: `job.card.{id}`, `job.open.{id}`, `job.title.{id}`, `job.save.{id}`; new `job.match.{id}`.
 */
function JobRowView({ job, saved, onToggleSave, onOpen }: Props) {
  const meta = [job.specialty, job.type, formatExp(job.experienceMin, job.experienceMax)]
    .filter(Boolean)
    .join(' · ');
  const where = `${job.location} · ${postedLabel(job.postedDays)}`;
  const salary = formatLPA(job.salaryMin, job.salaryMax);
  const match = job.matchPercent != null ? `${Math.round(job.matchPercent)}% match` : null;
  const spoken = [
    `${job.role} at ${job.hospital}`,
    job.hospitalVerified ? 'verified hospital' : null,
    salary,
    match,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View testID={`job.card.${job.id}`} style={styles.row}>
      <PressableScale
        testID={`job.open.${job.id}`}
        accessibilityLabel={spoken}
        pressScale={0.99}
        onPress={() => onOpen(job)}
        style={styles.main}
      >
        <LogoTile testID={`job.logo.${job.id}`} name={job.hospital} uri={job.hospitalLogoUrl} size={40} />
        <View style={styles.text}>
          <AppText testID={`job.title.${job.id}`} variant="rowTitle" numberOfLines={2}>
            {job.role}
          </AppText>
          <View style={styles.hospital}>
            <AppText variant="label" weight="regular" numberOfLines={1} style={styles.shrink}>
              {job.hospital}
            </AppText>
            {job.hospitalVerified ? (
              <Icon
                testID={`job.verified.${job.id}`}
                name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
                tintColor={colors.brand}
                size={14}
              />
            ) : null}
          </View>
          <AppText variant="secondary" color="mutedForeground" numberOfLines={1}>
            {meta}
          </AppText>
          {/* Own line: next to the salary it shrank to "K..." at 320 pt. */}
          <AppText variant="secondary" color="mutedForeground" numberOfLines={1}>
            {where}
          </AppText>
          <View style={styles.bottom}>
            <AppText variant="body" weight="semibold" tabular numberOfLines={1}>
              {salary}
            </AppText>
            {match ? <Pill testID={`job.match.${job.id}`} label={match} tone="brand" tabular /> : null}
          </View>
        </View>
      </PressableScale>
      <SaveButton testID={`job.save.${job.id}`} saved={saved} onPress={() => onToggleSave(job)} />
    </View>
  );
}

export const JobRow = memo(JobRowView);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: spacing['4'],
    paddingRight: spacing['1'],
    paddingVertical: spacing['3'],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
    backgroundColor: colors.background,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing['3'] },
  text: { flex: 1, gap: 2 },
  hospital: { flexDirection: 'row', alignItems: 'center', gap: spacing['1'] },
  shrink: { flexShrink: 1 },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    marginTop: spacing['1'],
    flexWrap: 'wrap',
  },
});
