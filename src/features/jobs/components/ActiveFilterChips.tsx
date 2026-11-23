import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { TextButton } from '@/components/ui/TextButton';
import { spacing } from '@/theme/tokens';

import type { ActiveFilterChip } from '../logic/filter';

/**
 * The website's "Active filters" chips, under the Search screen's Filters button. Unlike the website (where they only
 * show), a tap removes that one filter; "Clear all" does what the panel's reset icon does (filters and sort).
 * testIDs: `{testID}`, `{testID}.{chip.id}` (e.g. `search.active.city.Pune`), `{clearTestID}`.
 */
export function ActiveFilterChips({
  chips,
  onRemove,
  onClear,
  testID,
  clearTestID,
}: {
  chips: readonly ActiveFilterChip[];
  onRemove: (chip: ActiveFilterChip) => void;
  onClear: () => void;
  testID: string;
  clearTestID: string;
}) {
  if (chips.length === 0) return null;
  return (
    <View testID={testID} style={styles.row}>
      {chips.map((chip) => (
        <Chip
          key={chip.id}
          testID={`${testID}.${chip.id}`}
          label={chip.label}
          accessibilityLabel={`${chip.label}, tap to remove`}
          selected
          onPress={() => onRemove(chip)}
          onRemove={() => onRemove(chip)}
        />
      ))}
      <TextButton
        testID={clearTestID}
        label="Clear all"
        accessibilityLabel="Clear all filters"
        onPress={onClear}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing['2'] },
});
