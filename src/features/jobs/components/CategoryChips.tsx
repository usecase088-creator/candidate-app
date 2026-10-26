import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { spacing } from '@/theme/tokens';

type Props = {
  /** Distinct `job.category` values of the loaded jobs. */
  categories: string[];
  active: string | null;
  onChange: (category: string | null) => void;
};

/** Website CategoryRail wording: "All Roles" first. Built from real categories (PHASE-2.md finding 1). */
export function CategoryChips({ categories, active, onChange }: Props) {
  return (
    <ScrollView
      testID="categories.rail"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      <Chip
        testID="categories.chip.all"
        label="All Roles"
        selected={!active}
        onPress={() => onChange(null)}
      />
      {categories.map((c) => (
        <Chip
          key={c}
          testID={`categories.chip.${c}`}
          label={c}
          selected={active === c}
          onPress={() => onChange(c)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ row: { gap: spacing['2'], paddingVertical: spacing['1'] } });
