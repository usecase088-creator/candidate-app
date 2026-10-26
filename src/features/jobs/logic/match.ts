// "Recommended for you": port of the website's client-side matching (../job/candidates/src/lib/matchJobs.ts, lib/hydrate.ts).
import type { CandidateMe, MatchProfile } from '@/api/schemas/candidate';
import type { Job } from '@/api/schemas/jobs';

const DOCTOR_ROLE =
  'Clinical Practitioners & Super Specialists (MBBS/ MD Physician/ MD/MS / DM / MCh / DNB-SS etc)';

export function rolesMatch(cRole: string, jRole: string, jSpec: string): boolean {
  const cr = cRole.toLowerCase();
  const jr = jRole.toLowerCase();
  const js = jSpec.toLowerCase();

  if (cr === jr || jr.includes(cr) || js.includes(cr)) return true;

  if (
    cr.includes('clinical practitioners & super specialists') &&
    (jr.includes('doctor') || jr.includes('physician') || js.includes('doctor') || js.includes('medicine'))
  )
    return true;
  if (cr.includes('dentist') && (jr.includes('dentist') || js.includes('dentist') || js.includes('dental')))
    return true;
  if (cr.includes('nursing') && (jr.includes('nurse') || js.includes('nurse'))) return true;
  if (
    cr.includes('laboratory technologist') &&
    (jr.includes('technician') || jr.includes('tech') || js.includes('technician') || js.includes('lab'))
  )
    return true;
  if (
    cr.includes('pharmacy') &&
    (jr.includes('pharmacist') ||
      jr.includes('pharmacy') ||
      js.includes('pharmacist') ||
      js.includes('pharmacy'))
  )
    return true;
  if (
    cr.includes('administration') &&
    (jr.includes('admin') || jr.includes('management') || js.includes('admin') || js.includes('management'))
  )
    return true;

  const cWords = cr.split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
  const jWords = (jr + ' ' + js).split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
  return cWords.some((cw) => jWords.some((jw) => jw.includes(cw) || cw.includes(jw)));
}

/** Does the job's place match the candidate's city, state or preferred locations? */
function locationMatched(job: Job, profile: MatchProfile): boolean {
  const city = (profile.city ?? '').toLowerCase().trim();
  const state = (profile.state ?? '').toLowerCase().trim();
  const loc = (job.city || job.location || '').toLowerCase().trim();
  const preferred = profile.preferredLocations.map((p) => p.toLowerCase().trim()).filter(Boolean);

  if (city && loc) {
    const candidateCity = city.split(',')[0]?.trim() ?? '';
    if (
      candidateCity &&
      (loc.includes(candidateCity) || candidateCity.includes(loc.split(',')[0]?.trim() ?? ''))
    )
      return true;
  }
  if (state && loc && loc.includes(state)) return true;
  return preferred.some((p) => loc.includes(p) || (job.city != null && job.city.toLowerCase().includes(p)));
}

export function isLocationMatch(job: Job, profile: MatchProfile | null | undefined): boolean {
  if (!profile) return false;
  const noLocation =
    !(profile.city ?? '').trim() &&
    !(profile.state ?? '').trim() &&
    profile.preferredLocations.every((p) => !p.trim());
  // A candidate with no location information matches every place.
  return noLocation || locationMatched(job, profile);
}

export function scoreJobMatch(job: Job, profile: MatchProfile | null | undefined): number {
  if (!profile) return 0;
  let score = 40;
  const role = (profile.role ?? '').toLowerCase();
  if (role && rolesMatch(role, job.role.toLowerCase(), job.specialty.toLowerCase())) score += 20;

  const years = profile.yearsExperience ?? 0;
  const min = job.experienceMin ?? 0;
  const max = job.experienceMax ?? 20;
  if (years >= min && years <= max + 2) score += 20;
  else if (years >= min - 1) score += 10;

  if (locationMatched(job, profile)) score += 15;

  const skills = [...profile.clinicalSkills, ...profile.technicalSkills].map((s) => s.toLowerCase());
  if (job.tags.some((t) => skills.some((s) => s.includes(t.toLowerCase())))) score += 5;
  return Math.min(98, Math.max(52, score));
}

export type MatchedJob = Job & { matchPercent: number };

/**
 * With a profile of 20% or more: score on the device, keep 55+ in the candidate's location.
 * Otherwise use the server's `matchPercent` (only above 0). Best first.
 */
export function computeJobMatches(
  jobs: readonly Job[],
  profile: MatchProfile | null | undefined,
): MatchedJob[] {
  if (!profile || profile.completeness < 20) {
    return jobs
      .map((j) => ({ ...j, matchPercent: j.matchPercent ?? 0 }))
      .filter((j) => j.matchPercent > 0)
      .sort((a, b) => b.matchPercent - a.matchPercent);
  }
  return jobs
    .map((j) => ({ ...j, matchPercent: scoreJobMatch(j, profile) }))
    .filter((j) => j.matchPercent >= 55 && isLocationMatch(j, profile))
    .sort((a, b) => b.matchPercent - a.matchPercent);
}

/** Website hydrateProfileFromApi: the form profile, or a minimal one for an uploaded CV (completeness 60). */
export function toMatchProfile(me: CandidateMe | undefined): MatchProfile | null {
  if (!me) return null;
  if (me.profile && me.cvSource !== 'upload') return me.profile;
  if (me.cvSource === 'upload') {
    return {
      role: me.role || DOCTOR_ROLE,
      yearsExperience: me.experienceYears ?? 0,
      city: me.location ?? '',
      state: me.profile?.state || me.location || '',
      preferredLocations: [],
      clinicalSkills: [],
      technicalSkills: [],
      completeness: 60,
    };
  }
  return null;
}
