// "Applying for" card at the top of every apply screen (website: routes/apply.$jobId.index.tsx).
import { StyleSheet, View } from 'react-native';

import type { Job } from '@/api/schemas/jobs';
import { AppText } from '@/components/ui/Text';
import { HospitalLogo } from '@/features/jobs/components/HospitalLogo';
import { VerifiedBadge } from '@/features/jobs/components/VerifiedBadge';
import { colors, radius, spacing } from '@/theme/tokens';

export function ApplyingForCard({ job, testID = 'apply.job' }: { job: Job; testID?: string }) {
  return (
    <View testID={testID} style={styles.card}>
      <HospitalLogo uri={job.hospitalLogoUrl} size={48} />
      <View style={styles.text}>
        <AppText variant="caption" weight="medium" color="mutedForeground" style={styles.upper}>
          Applying for
        </AppText>
        <AppText variant="heading" accessibilityRole="header">
          {job.role}
        </AppText>
        {job.hospitalVerified ? <VerifiedBadge label="Verified Hospital" /> : null}
        <AppText color="mutedForeground">{`${job.hospital} · ${job.location}`}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing['4'],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing['4'],
  },
  text: { flexShrink: 1, flexGrow: 1, gap: spacing['1'] },
  upper: { textTransform: 'uppercase', letterSpacing: 0.6 },
});
