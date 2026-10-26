// Search text, city, category, filters and sort. One store so they stay when the user moves between tabs
// (PLAN.md Phase 2). Reset on sign-out by the root layout, so the next user starts clean.
import { create } from 'zustand';

import { DEFAULT_FILTERS, EXP_RANGE, type FilterState, type SortKey, SALARY_RANGE } from './logic/filter';

type State = FilterState;

type Actions = {
  setQuery: (query: string) => void;
  setCity: (city: string) => void;
  setCategory: (category: string | null) => void;
  toggleCity: (city: string) => void;
  toggleType: (type: string) => void;
  setMinExp: (years: number) => void;
  setMinSalary: (lpa: number) => void;
  setSort: (sort: SortKey) => void;
  /** The reset icon of the website's filter panel: filters and sort only. */
  resetFilters: () => void;
  /** Sign-out. */
  resetAll: () => void;
};

const INITIAL: State = { query: '', city: '', category: null, ...DEFAULT_FILTERS };

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

const clamp = (n: number, { min, max }: { min: number; max: number }) => Math.min(max, Math.max(min, n));

export const useFilterStore = create<State & Actions>()((set) => ({
  ...INITIAL,
  setQuery: (query) => set({ query }),
  setCity: (city) => set({ city }),
  setCategory: (category) => set({ category }),
  toggleCity: (city) => set((s) => ({ cities: toggle(s.cities, city) })),
  toggleType: (type) => set((s) => ({ types: toggle(s.types, type) })),
  setMinExp: (years) => set({ minExp: clamp(years, EXP_RANGE) }),
  setMinSalary: (lpa) => set({ minSalary: clamp(lpa, SALARY_RANGE) }),
  setSort: (sort) => set({ sort }),
  resetFilters: () => set({ ...DEFAULT_FILTERS }),
  resetAll: () => set({ ...INITIAL }),
}));

/** The data part of the store, for `applyFilters`. */
export function selectFilterState(s: State): FilterState {
  return {
    query: s.query,
    city: s.city,
    category: s.category,
    cities: s.cities,
    minExp: s.minExp,
    minSalary: s.minSalary,
    types: s.types,
    sort: s.sort,
  };
}

export function resetFilterStoreForTests() {
  useFilterStore.getState().resetAll();
}
