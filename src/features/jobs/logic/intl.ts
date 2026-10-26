// International jobs: country chips, search and visa colours (website foreign-jobs.tsx).
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

const VISA_BADGE: Record<string, { bg: string; text: string }> = {
  Sponsorship: { bg: '#dcfce7', text: '#15803d' },
  Employer: { bg: '#dbeafe', text: '#1d4ed8' },
  Depends: { bg: '#fef9c3', text: '#854d0e' },
  Self: { bg: '#f3e8ff', text: '#6b21a8' },
  'Not Required': { bg: '#f1f5f9', text: '#475569' },
  TBD: { bg: '#f1f5f9', text: '#94a3b8' },
};

const UNKNOWN_VISA = { bg: '#f1f5f9', text: '#94a3b8' };

export function visaColors(visa: string): { bg: string; text: string } {
  return VISA_BADGE[visa] ?? UNKNOWN_VISA;
}
