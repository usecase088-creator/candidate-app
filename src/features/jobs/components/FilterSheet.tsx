import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Stepper } from '@/components/ui/Stepper';
import { AppText } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';

import { useFilterStore } from '../filterStore';
import {
  activeFilterCount,
  EXP_RANGE,
  JOB_TYPES,
  SALARY_RANGE,
  SORT_LABELS,
  type SortKey,
} from '../logic/filter';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Cities that exist in the loaded jobs. */
  cities: string[];
  /** How many roles match right now (for the Done button). */
  resultCount: number;
};

const SORTS: SortKey[] = ['latest', 'salary', 'relevance'];

/**
 * Website FilterSidebar as a full-screen sheet: sort, location, experience, salary, job type, reset.
 * Changes apply at once (the website has no apply button). testIDs: `filters.*`.
 */
export function FilterSheet({ visible, onClose, cities, resultCount }: Props) {
  const f = useFilterStore();
  const active = activeFilterCount(f);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView testID="filters.sheet" style={styles.root}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <AppText variant="caption" color="mutedForeground">
              Refine search
            </AppText>
            <AppText variant="heading">Premium filters</AppText>
          </View>
          <Button testID="filters.close" label="Close" variant="ghost" fullWidth={false} onPress={onClose} />
        </View>

        <ScrollView testID="filters.scroll" contentContainerStyle={styles.body}>
          <View style={styles.summary}>
            <AppText variant="caption" weight="semibold" color="mutedForeground">
              Active filters
            </AppText>
            <AppText testID="filters.summary" variant="label" weight="semibold">
              {active === 0 ? 'No filters applied' : `${active} applied`}
            </AppText>
          </View>

          <Group title="Sort by" subtitle="Control ranking">
            <View style={styles.wrap}>
              {SORTS.map((s) => (
                <Chip
                  key={s}
                  testID={`filters.sort.${s}`}
                  label={SORT_LABELS[s]}
                  selected={f.sort === s}
                  onPress={() => f.setSort(s)}
                />
              ))}
            </View>
          </Group>

          <Group title="Location" subtitle={`${cities.length} cities available`}>
            <View style={styles.wrap}>
              {cities.map((c) => (
                <Chip
                  key={c}
                  testID={`filters.city.${c}`}
                  label={c}
                  selected={f.cities.includes(c)}
                  onPress={() => f.toggleCity(c)}
                />
              ))}
            </View>
          </Group>

          <Group title="Experience" subtitle={`${f.minExp}+ years minimum`}>
            <Stepper
              testID="filters.exp"
              label="minimum experience"
              value={f.minExp}
              {...EXP_RANGE}
              display={f.minExp >= EXP_RANGE.max ? '15+ yrs' : `${f.minExp} yrs`}
              onChange={f.setMinExp}
            />
          </Group>

          <Group title="Salary" subtitle={`₹${f.minSalary}+ LPA minimum`}>
            <Stepper
              testID="filters.salary"
              label="minimum salary"
              value={f.minSalary}
              {...SALARY_RANGE}
              display={f.minSalary === 0 ? 'Any' : `₹${f.minSalary}+ LPA`}
              onChange={f.setMinSalary}
            />
          </Group>

          <Group title="Job type" subtitle="Role structure">
            <View style={styles.wrap}>
              {JOB_TYPES.map((t) => (
                <Chip
                  key={t}
                  testID={`filters.type.${t}`}
                  label={t}
                  selected={f.types.includes(t)}
                  onPress={() => f.toggleType(t)}
                />
              ))}
            </View>
          </Group>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            testID="filters.reset"
            label="Reset filters"
            variant="outline"
            fullWidth={false}
            onPress={f.resetFilters}
          />
          <Button
            testID="filters.done"
            label={`Show ${resultCount} ${resultCount === 1 ? 'role' : 'roles'}`}
            fullWidth={false}
            onPress={onClose}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Group({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <AppText variant="label" weight="semibold" accessibilityRole="header" style={styles.upper}>
        {title}
      </AppText>
      <AppText variant="caption" color="mutedForeground">
        {subtitle}
      </AppText>
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing['4'],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  body: { padding: spacing['4'], gap: spacing['5'] },
  summary: {
    backgroundColor: colors.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing['3'],
    gap: spacing['1'],
  },
  group: { gap: spacing['1'] },
  groupBody: { marginTop: spacing['2'] },
  upper: { textTransform: 'uppercase', letterSpacing: 0.6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'] },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing['3'],
    padding: spacing['4'],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
