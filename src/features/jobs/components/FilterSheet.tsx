import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Stepper } from '@/components/ui/Stepper';
import { AppText } from '@/components/ui/Text';
import { colors, ICON_BUTTON, spacing, touchSlop } from '@/theme/tokens';

import { selectFilterState, useFilterStore } from '../filterStore';
import { useJobs } from '../hooks/useJobsData';
import {
  activeFilterCount,
  applyFilters,
  citiesOf,
  EXP_RANGE,
  JOB_TYPES,
  SALARY_RANGE,
  SORT_LABELS,
  type SortKey,
} from '../logic/filter';

const SORTS: SortKey[] = ['latest', 'salary', 'relevance'];

/**
 * Website FilterSidebar as a bottom sheet (D32): the `/filters` route is presented as a form sheet over the Search tab.
 * Sort, location, experience, salary, job type, reset. Changes apply at once (the website has no apply button); the
 * primary button only closes the sheet and says how many roles match. testIDs: `filters.*`.
 */
export function FilterSheet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const f = useFilterStore();
  const filterState = useFilterStore(useShallow(selectFilterState));
  const jobs = useJobs().data;
  const cities = useMemo(() => citiesOf(jobs ?? []), [jobs]);
  const resultCount = useMemo(() => applyFilters(jobs ?? [], filterState).length, [jobs, filterState]);
  const active = activeFilterCount(f);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/search'));

  return (
    <View testID="filters.sheet" style={styles.root}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="secondary" color="mutedForeground">
            Refine search
          </AppText>
          <AppText variant="title">Premium filters</AppText>
        </View>
        <PressableScale
          testID="filters.close"
          accessibilityLabel="Close"
          onPress={close}
          pressScale={0.9}
          hitSlop={touchSlop(ICON_BUTTON)}
          style={styles.close}
        >
          <Icon
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            tintColor={colors.foreground}
            size={20}
          />
        </PressableScale>
      </View>

      {/* flex: 1 + the footer outside the scroll view: the list shrinks, the footer never leaves the sheet (R3 #14). */}
      <ScrollView
        testID="filters.scroll"
        style={styles.flex}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <AppText testID="filters.summary" variant="secondary" color="mutedForeground">
          {active === 0 ? 'No filters applied' : `${active} applied`}
        </AppText>

        <Group id="sort" title="Sort by" meta="Control ranking">
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

        <Group id="location" title="Location" meta={`${cities.length} cities available`}>
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

        <Group id="exp" title="Experience" meta={`${f.minExp}+ years minimum`}>
          <Stepper
            testID="filters.exp"
            label="minimum experience"
            value={f.minExp}
            {...EXP_RANGE}
            display={f.minExp >= EXP_RANGE.max ? '15+ yrs' : `${f.minExp} yrs`}
            onChange={f.setMinExp}
          />
        </Group>

        <Group
          id="salary"
          title="Salary"
          // The stepper already says "Any" at 0; a "₹0+ LPA minimum" caption next to it would contradict it.
          meta={f.minSalary === 0 ? undefined : `₹${f.minSalary}+ LPA minimum`}
        >
          <Stepper
            testID="filters.salary"
            label="minimum salary"
            value={f.minSalary}
            {...SALARY_RANGE}
            display={f.minSalary === 0 ? 'Any' : `₹${f.minSalary}+ LPA`}
            onChange={f.setMinSalary}
          />
        </Group>

        <Group id="type" title="Job type" meta="Role structure">
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

      <View style={[styles.footer, { paddingBottom: Math.max(spacing['3'], insets.bottom) }]}>
        <Button
          testID="filters.reset"
          label="Reset filters"
          variant="ghost"
          size="md"
          fullWidth={false}
          onPress={f.resetFilters}
        />
        <View style={styles.flex}>
          <Button
            testID="filters.done"
            label={`Show ${resultCount} ${resultCount === 1 ? 'role' : 'roles'}`}
            size="md"
            haptic="light"
            onPress={close}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * D32: sentence-case 17/600 header, 24 above, 12 to the controls. R2 (issue 17): the website caption sits under the
 * header as a 13-pt muted line instead of competing with it on the right.
 */
function Group({
  id,
  title,
  meta,
  children,
}: {
  id: string;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <View testID={`filters.group.${id}`} style={styles.group}>
      <View testID={`filters.group.${id}.header`} style={styles.groupHeader}>
        <AppText variant="heading">{title}</AppText>
        {meta ? (
          <AppText testID={`filters.group.${id}.meta`} variant="secondary" color="mutedForeground">
            {meta}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    paddingHorizontal: spacing['4'],
    paddingTop: spacing['4'],
    paddingBottom: spacing['3'],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  close: { width: ICON_BUTTON, height: ICON_BUTTON, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: spacing['4'], paddingTop: spacing['3'], paddingBottom: spacing['6'] },
  group: { gap: spacing['3'], paddingTop: spacing['6'] },
  groupHeader: { gap: spacing['0.5'] },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'] },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    paddingHorizontal: spacing['4'],
    paddingTop: spacing['3'],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
    backgroundColor: colors.surface,
  },
});
