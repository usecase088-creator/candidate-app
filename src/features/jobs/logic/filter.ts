// Search, filters and sort for the job lists. The website fetches all jobs and filters on the device
// (../job/candidates/src/lib/jobSearch.ts, routes/index.tsx), so the app does the same: no paging, the server sends up to 50.
import type { Job } from '@/api/schemas/jobs';

export type SortKey = 'latest' | 'salary' | 'relevance';

export type Filters = {
  cities: string[];
  minExp: number;
  minSalary: number;
  types: string[];
  sort: SortKey;
};

export type FilterState = Filters & {
  query: string;
  city: string;
  /** Exact `job.category` (the recruiter's role type). */
  category: string | null;
};

export const DEFAULT_FILTERS: Filters = { cities: [], minExp: 0, minSalary: 0, types: [], sort: 'latest' };

export const JOB_TYPES = ['Full-time', 'Locum', 'Part-time', 'Contract'] as const;

export const SORT_LABELS: Record<SortKey, string> = {
  latest: 'Latest roles',
  salary: 'Salary high to low',
  relevance: 'Profile relevance',
};

/** Website slider ranges (components/jobs/FilterSidebar.tsx). */
export const EXP_RANGE = { min: 0, max: 15, step: 1 } as const;
export const SALARY_RANGE = { min: 0, max: 50, step: 2 } as const;

export function jobMatchesSearch(job: Job, query: string, city: string): boolean {
  const q = query.trim().toLowerCase();
  const c = city.trim().toLowerCase();

  if (c && !`${job.city ?? ''} ${job.location ?? ''}`.toLowerCase().includes(c)) return false;
  if (!q) return true;

  const hay = [
    job.role,
    job.specialty,
    job.hospital,
    job.location,
    job.city,
    job.category,
    job.type,
    job.tags.join(' '),
    job.description?.replace(/<[^>]+>/g, ' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

export function applyFilters(jobs: readonly Job[], f: FilterState): Job[] {
  let list = jobs.filter((j) => jobMatchesSearch(j, f.query, f.city));
  if (f.category) list = list.filter((j) => j.category === f.category);
  if (f.cities.length) list = list.filter((j) => j.city != null && f.cities.includes(j.city));
  list = list.filter((j) => (j.experienceMin ?? 0) >= f.minExp || (j.experienceMax ?? 0) >= f.minExp);
  list = list.filter((j) => j.salaryMax >= f.minSalary);
  if (f.types.length) list = list.filter((j) => f.types.includes(j.type));

  if (f.sort === 'salary') list.sort((a, b) => b.salaryMax - a.salaryMax);
  else if (f.sort === 'relevance') list.sort((a, b) => (b.matchPercent ?? 0) - (a.matchPercent ?? 0));
  else list.sort((a, b) => a.postedDays - b.postedDays);
  return list;
}

const distinctSorted = (values: (string | null | undefined)[]) =>
  Array.from(new Set(values.filter((v): v is string => !!v))).sort();

export const citiesOf = (jobs: readonly Job[]) => distinctSorted(jobs.map((j) => j.city));

/** The categories rail is built from the real values (finding 1 in PHASE-2.md). */
export const categoriesOf = (jobs: readonly Job[]) => distinctSorted(jobs.map((j) => j.category));

export function activeFilterCount(f: Filters): number {
  return (
    f.cities.length +
    f.types.length +
    (f.minExp > 0 ? 1 : 0) +
    (f.minSalary > 0 ? 1 : 0) +
    (f.sort !== 'latest' ? 1 : 0)
  );
}

export type JobInsights = { roles: string; topLpa: string; bestFit: string };

/**
 * The website filter panel's three tiles (FilterSidebar `Insight`): over every loaded job, not the filtered list.
 * Top LPA is the highest `salaryMax` ("0" when none), Best fit the highest `matchPercent` ("—" when none).
 */
export function jobInsights(jobs: readonly Job[]): JobInsights {
  const topSalary = jobs.reduce((max, j) => Math.max(max, Number(j.salaryMax || 0)), 0);
  const strongestMatch = jobs.reduce((max, j) => Math.max(max, Number(j.matchPercent || 0)), 0);
  return {
    roles: `${jobs.length}`,
    topLpa: topSalary ? `${topSalary}` : '0',
    bestFit: strongestMatch ? `${strongestMatch}%` : '—',
  };
}

export type ActiveFilterChip =
  | { id: `city.${string}`; kind: 'city'; value: string; label: string }
  | { id: `type.${string}`; kind: 'type'; value: string; label: string }
  | { id: 'exp' | 'salary' | 'sort'; kind: 'exp' | 'salary' | 'sort'; label: string };

/**
 * The website's "Active filters" chips, in its order: cities, job types, "N+ yrs", "₹N+ LPA", then the sort (the
 * website prints the raw key, e.g. "salary"; the app uses the sort's own label). One chip per counted filter.
 */
export function activeFilterChips(f: Filters): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [
    ...f.cities.map((c) => ({ id: `city.${c}` as const, kind: 'city' as const, value: c, label: c })),
    ...f.types.map((t) => ({ id: `type.${t}` as const, kind: 'type' as const, value: t, label: t })),
  ];
  if (f.minExp > 0) chips.push({ id: 'exp', kind: 'exp', label: `${f.minExp}+ yrs` });
  if (f.minSalary > 0) chips.push({ id: 'salary', kind: 'salary', label: `₹${f.minSalary}+ LPA` });
  if (f.sort !== 'latest') chips.push({ id: 'sort', kind: 'sort', label: SORT_LABELS[f.sort] });
  return chips;
}

/** The filters with one chip's filter removed (back to its default). */
export function withoutFilter<F extends Filters>(f: F, chip: ActiveFilterChip): F {
  switch (chip.kind) {
    case 'city':
      return { ...f, cities: f.cities.filter((c) => c !== chip.value) };
    case 'type':
      return { ...f, types: f.types.filter((t) => t !== chip.value) };
    case 'exp':
      return { ...f, minExp: DEFAULT_FILTERS.minExp };
    case 'salary':
      return { ...f, minSalary: DEFAULT_FILTERS.minSalary };
    case 'sort':
      return { ...f, sort: DEFAULT_FILTERS.sort };
  }
}
