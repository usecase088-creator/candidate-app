// Government jobs search: authority or exam name, lower-case `includes` (website gov-jobs.tsx).
export function govFilter<T extends { examAuthority: string; name: string }>(
  jobs: readonly T[],
  search: string,
): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return [...jobs];
  return jobs.filter((j) => j.examAuthority.toLowerCase().includes(q) || j.name.toLowerCase().includes(q));
}
