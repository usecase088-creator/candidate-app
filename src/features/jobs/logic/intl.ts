// International jobs: country chips, search and visa pill tones (website foreign-jobs.tsx).
import type { PillTone } from '@/components/ui/Pill';

type IntlLike = {
  jobPosition: string;
  specialty: string;
  city: string;
  country: string;
  qualification?: string | null;
  license?: string | null;
};

export const ALL_COUNTRIES = 'All';

export function countriesOf(jobs: readonly { country: string }[]): string[] {
  return [ALL_COUNTRIES, ...Array.from(new Set(jobs.map((j) => j.country))).sort()];
}

export function intlFilter<T extends IntlLike>(jobs: readonly T[], search: string, country: string): T[] {
  let list = [...jobs];
  if (country !== ALL_COUNTRIES) list = list.filter((j) => j.country === country);
  const q = search.trim().toLowerCase();
  if (!q) return list;
  return list.filter((j) =>
    [j.jobPosition, j.specialty, j.city, j.country, j.qualification ?? '', j.license ?? ''].some((v) =>
      v.toLowerCase().includes(q),
    ),
  );
}

/**
 * D32: the website paints the visa cell with six raw Tailwind pairs (green, blue, yellow, purple, two slates; the
 * unknown one is 2.3:1). The app keeps the website's six states but maps them to its own semantic pill tones:
 * sponsored = success, employer-arranged = info, depends = warning, self / not required / not sponsored = neutral,
 * TBD and anything unknown = warning (the candidate has to find out).
 */
const VISA_TONE: Record<string, PillTone> = {
  Sponsorship: 'success',
  Employer: 'info',
  Depends: 'warning',
  Self: 'neutral',
  'Not Required': 'neutral',
  'Not Sponsored': 'neutral',
  'No Sponsorship': 'neutral',
  TBD: 'warning',
};

export function visaTone(visa: string): PillTone {
  return VISA_TONE[visa] ?? 'warning';
}
