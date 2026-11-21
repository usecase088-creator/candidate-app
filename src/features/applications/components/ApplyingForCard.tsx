// "Applying for" row at the top of every apply screen (website: routes/apply.$jobId.index.tsx). D32: a compact row,
// no card border: logo tile 40, role 16/600, hospital line 13 muted, one "Verified Hospital" pill.
import { StyleSheet, View } from 'react-native';

import type { Job } from '@/api/schemas/jobs';
import { LogoTile } from '@/components/ui/LogoTile';
import { Pill } from '@/components/ui/Pill';
import { AppText } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

const SEAL = { ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' } as const;

export function ApplyingForCard({ job, testID = 'apply.job' }: { job: Job; testID?: string }) {
  return (
    <View testID={testID} style={styles.row}>
      <LogoTile testID={`${testID}.logo`} name={job.hospital} uri={job.hospitalLogoUrl} size={40} />
      <View style={styles.text}>
        <AppText variant="caption" color="mutedForeground">
          Applying for
        </AppText>
        <AppText variant="rowTitle" accessibilityRole="header" numberOfLines={2}>
          {job.role}
        </AppText>
        <AppText variant="secondary" color="mutedForeground" numberOfLines={2}>
          {`${job.hospital} · ${job.location}`}
        </AppText>
        {job.hospitalVerified ? (
          <View style={styles.pill}>
            <Pill testID={`${testID}.verified`} label="Verified Hospital" tone="brand" icon={SEAL} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['3'] },
  text: { flexShrink: 1, flexGrow: 1, gap: spacing['0.5'] },
  pill: { paddingTop: spacing['1'] },
});
