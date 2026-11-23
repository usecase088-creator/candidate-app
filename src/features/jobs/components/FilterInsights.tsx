import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

import type { JobInsights } from '../logic/filter';

const TILES = [
  { key: 'roles', label: 'Roles' },
  { key: 'topLpa', label: 'Top LPA' },
  { key: 'bestFit', label: 'Best fit' },
] as const satisfies readonly { key: keyof JobInsights; label: string }[];

/**
 * The website filter panel's three insight tiles (FilterSidebar `Insight`): Roles, Top LPA, Best fit, in one row.
 * Each tile is one accessibility element ("Top LPA, 40"). testIDs: `{testID}` for the row and
 * `{tilePrefix}.roles|topLpa|bestFit` for the tiles.
 */
export function FilterInsights({
  insights,
  testID,
  tilePrefix,
}: {
  insights: JobInsights;
  testID: string;
  tilePrefix: string;
}) {
  return (
    <View testID={testID} style={styles.row}>
      {TILES.map(({ key, label }) => (
        <View
          key={key}
          testID={`${tilePrefix}.${key}`}
          accessible
          accessibilityLabel={`${label}, ${insights[key]}`}
          style={styles.tile}
        >
          <AppText variant="caption" color="mutedForeground" numberOfLines={1}>
            {label}
          </AppText>
          <AppText variant="rowTitle" tabular numberOfLines={1}>
            {insights[key]}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing['2'] },
  // flex 1 + minWidth 0: three equal tiles that shrink at 320 pt instead of pushing the row wider.
  tile: {
    flex: 1,
    minWidth: 0,
    gap: spacing['0.5'],
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
  },
});
