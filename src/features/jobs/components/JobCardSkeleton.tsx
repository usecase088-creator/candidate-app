import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radius, spacing } from '@/theme/tokens';

/** Placeholder with the shape of a JobCard while the list loads. */
export function JobCardSkeleton({ testID }: { testID?: string }) {
  return (
    <View testID={testID} style={styles.card}>
      <View style={styles.top}>
        <Skeleton width={44} height={44} radius={radius.lg} />
        <View style={styles.lines}>
          <Skeleton width="70%" height={14} />
          <Skeleton width="45%" height={12} />
        </View>
      </View>
      <Skeleton width="60%" height={18} />
      <Skeleton width="35%" height={12} />
      <View style={styles.pills}>
        <Skeleton width={72} height={24} radius={radius.full} />
        <Skeleton width={64} height={24} radius={radius.full} />
        <Skeleton width={96} height={24} radius={radius.full} />
      </View>
    </View>
  );
}

/** Three cards, for list screens. testIDs: `{testID}`, `{testID}.0` ... */
export function JobListSkeleton({ testID }: { testID: string }) {
  return (
    <View testID={testID}>
      {[0, 1, 2].map((i) => (
        <JobCardSkeleton key={i} testID={`${testID}.${i}`} />
      ))}
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
    gap: spacing['3'],
  },
  top: { flexDirection: 'row', gap: spacing['3'], alignItems: 'center' },
  lines: { flex: 1, gap: spacing['2'] },
  pills: { flexDirection: 'row', gap: spacing['2'] },
});
