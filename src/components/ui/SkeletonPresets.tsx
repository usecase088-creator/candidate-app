import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

import { Skeleton } from './Skeleton';

type PresetProps = {
  testID: string;
  /** Rows to draw (default 1). testIDs: `{testID}.0`, `{testID}.1` ... */
  count?: number;
};

/** Screen readers hear one "Loading" for the group; the blocks inside are hidden. */
function Group({ testID, children }: { testID: string; children: React.ReactNode }) {
  return (
    <View testID={testID} accessible accessibilityLabel="Loading" accessibilityRole="progressbar">
      {children}
    </View>
  );
}

/**
 * The shape of a JobRow while a list loads (D32): 40 logo, role 16, hospital 14, meta 13, salary 15 + match pill,
 * ~116 pt with 12-pt vertical padding and a hairline separator, so rows don't jump when data lands.
 */
export function JobRowSkeleton({ testID, count = 1 }: PresetProps) {
  return (
    <Group testID={testID}>
      {Array.from({ length: count }, (_, i) => {
        const id = `${testID}.${i}`;
        return (
          <View key={i} testID={id} style={styles.jobRow}>
            <Skeleton testID={`${id}.logo`} width={40} height={40} radius={radius.md} />
            <View style={styles.jobLines}>
              <View style={styles.line22}>
                <Skeleton testID={`${id}.title`} width="70%" height={16} />
              </View>
              <View style={styles.line20}>
                <Skeleton testID={`${id}.line2`} width="55%" height={14} />
              </View>
              <View style={styles.line18}>
                <Skeleton testID={`${id}.line3`} width="45%" height={13} />
              </View>
              <View style={[styles.line20, styles.spaceBetween]}>
                <Skeleton testID={`${id}.line4`} width="30%" height={15} />
                <Skeleton testID={`${id}.pill`} width={56} height={22} radius={radius.full} />
              </View>
            </View>
          </View>
        );
      })}
    </Group>
  );
}

/** The shape of a 52-pt ListRow (notifications, settings): 24 leading circle and a 15-pt line. */
export function ListRowSkeleton({ testID, count = 1 }: PresetProps) {
  return (
    <Group testID={testID}>
      {Array.from({ length: count }, (_, i) => {
        const id = `${testID}.${i}`;
        return (
          <View key={i} testID={id} style={styles.listRow}>
            <Skeleton testID={`${id}.leading`} width={24} height={24} radius={radius.full} />
            <Skeleton testID={`${id}.line`} width="60%" height={15} />
          </View>
        );
      })}
    </Group>
  );
}

const styles = StyleSheet.create({
  jobRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing['3'],
    paddingVertical: spacing['3'],
    paddingHorizontal: spacing['4'],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  jobLines: { flex: 1, gap: spacing['1'] },
  // Each line box has the real text line height, so the row is as tall as a JobRow (22 + 20 + 18 + 20 + 3 gaps + 24).
  line22: { height: 22, justifyContent: 'center' },
  line20: { height: 20, justifyContent: 'center' },
  line18: { height: 18, justifyContent: 'center' },
  spaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    paddingHorizontal: spacing['4'],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
});
