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
