import type { MatchProfile } from '@/api/schemas/candidate';
import type { Job } from '@/api/schemas/jobs';
import { formProfile, publicJob } from '@/test/fixtures/jobs';

import { computeJobMatches, isLocationMatch, rolesMatch, scoreJobMatch, toMatchProfile } from '../match';

const base = publicJob as unknown as Job;
const job = (over: Partial<Job>): Job => ({ ...base, tags: [], ...over });
const profile = (over: Partial<MatchProfile> = {}): MatchProfile => ({
  ...(formProfile as MatchProfile),
  ...over,
});

describe('rolesMatch (website lib/matchJobs.ts)', () => {
  it.each([
    ['staff nurse', 'staff nurse', '', true],
    ['nurse', 'senior nurse', 'icu', true],
    ['nursing professionals & paramedics', 'staff nurse', 'nursing', true],
    ['clinical practitioners & super specialists (mbbs)', 'cardiologist', 'general medicine', true],
    ['dentist and super specialists (bds/mds)', 'locum dental surgeon', 'dental surgeon', true],
    ['laboratory technologist & diagnostic services', 'lab technician', 'pathology', true],
    ['pharmacy & pharmaceutical professionals', 'pharmacist', '', true],
    ['hospital administration & management', 'billing executive', 'admin', true],
    ['nursing professionals & paramedics', 'cardiologist', 'cardiology', false],
  ])('%s vs %s / %s', (c, r, s, out) => expect(rolesMatch(c, r, s)).toBe(out));

  it('falls back to words of 4+ letters', () => {
    expect(rolesMatch('physiotherapy and rehabilitation professionals', 'physiotherapist', 'rehab')).toBe(
      true,
    );
  });
});

describe('isLocationMatch', () => {
  it('no profile: false', () => expect(isLocationMatch(job({}), null)).toBe(false));
  it('a profile with no location at all matches everything', () => {
    expect(isLocationMatch(job({}), profile({ city: '', state: '', preferredLocations: [] }))).toBe(true);
  });
  it('city, state and preferred locations', () => {
    const kolkata = job({ city: 'Kolkata', location: 'Kolkata, West Bengal' });
    expect(isLocationMatch(kolkata, profile({ city: 'Kolkata', state: '', preferredLocations: [] }))).toBe(
      true,
    );
    // The website compares the state with `job.city || job.location`: only a job without a city can match on state.
    const noCity = job({ city: '', location: 'Kolkata, West Bengal' });
    expect(
      isLocationMatch(noCity, profile({ city: 'Pune', state: 'West Bengal', preferredLocations: [] })),
    ).toBe(true);
    expect(
      isLocationMatch(kolkata, profile({ city: 'Pune', state: 'West Bengal', preferredLocations: [] })),
    ).toBe(false);
    expect(
      isLocationMatch(kolkata, profile({ city: 'Pune', state: 'Goa', preferredLocations: ['kolkata'] })),
    ).toBe(true);
    expect(
      isLocationMatch(kolkata, profile({ city: 'Pune', state: 'Goa', preferredLocations: ['Delhi'] })),
    ).toBe(false);
  });
});

describe('scoreJobMatch', () => {
  it('no profile: 0', () => expect(scoreJobMatch(job({}), null)).toBe(0));

  it('base 40, +20 role, +20 experience in range, +15 location, +5 skill, clamped to 52..98', () => {
    const best = job({
      role: 'Staff Nurse',
      specialty: 'Nursing',
      experienceMin: 1,
      experienceMax: 5,
      city: 'Kolkata',
      location: 'Kolkata',
      tags: ['GNM'],
    });
    expect(scoreJobMatch(best, profile())).toBe(98); // 100 -> 98
    const none = job({
      role: 'Cardiologist',
      specialty: 'Cardiology',
      experienceMin: 10,
      experienceMax: 15,
      city: 'Delhi',
      location: 'Delhi',
      tags: [],
    });
    const far = profile({ yearsExperience: 0, preferredLocations: [], city: 'Pune', state: 'Goa' });
    expect(scoreJobMatch(none, far)).toBe(52); // 40 -> 52
  });

  it('experience one year short scores +10', () => {
    const j = job({
      role: 'Cardiologist',
      specialty: 'x',
      experienceMin: 4,
      experienceMax: 9,
      city: 'Delhi',
      location: 'Delhi',
      tags: [],
    });
    expect(
      scoreJobMatch(j, profile({ yearsExperience: 3, city: 'Delhi', state: '', preferredLocations: [] })),
    ).toBe(
      65, // 40 + 10 + 15
    );
  });
});

describe('computeJobMatches', () => {
  const nurse = job({
    id: 'n',
    role: 'Staff Nurse',
    specialty: 'Nursing',
    experienceMin: 1,
    experienceMax: 5,
    city: 'Kolkata',
    location: 'Kolkata',
    tags: ['GNM'],
  });
  const far = job({
    id: 'f',
    role: 'Cardiologist',
    specialty: 'Cardiology',
    experienceMin: 1,
    experienceMax: 5,
    city: 'Delhi',
    location: 'Delhi',
  });

  it('profile 20%+: client score, at least 55, in the candidate location, best first', () => {
    const out = computeJobMatches([far, nurse], profile());
    expect(out.map((j) => j.id)).toEqual(['n']);
    expect(out[0]?.matchPercent).toBe(98);
  });

  it('no profile or under 20%: the server score, only above 0, best first', () => {
    const a = job({ id: 'a', matchPercent: 60 });
    const b = job({ id: 'b', matchPercent: 90 });
    const c = job({ id: 'c', matchPercent: null });
    expect(computeJobMatches([a, b, c], null).map((j) => j.id)).toEqual(['b', 'a']);
    expect(computeJobMatches([a, b, c], profile({ completeness: 19 })).map((j) => j.id)).toEqual(['b', 'a']);
  });
});

describe('toMatchProfile (website lib/hydrate.ts)', () => {
  it('uses the form profile when the CV was built with the form', () => {
    expect(toMatchProfile({ id: 'c', cvSource: 'form', profile: formProfile as MatchProfile })).toMatchObject(
      {
        completeness: 80,
      },
    );
  });
  it('makes a minimal profile for an uploaded CV: completeness 60, role, experience and location from the candidate', () => {
    const p = toMatchProfile({
      id: 'c',
      cvSource: 'upload',
      role: 'Nursing Professionals & Paramedics',
      experienceYears: 4,
      location: 'Pune',
      profile: null,
    });
    expect(p).toMatchObject({
      completeness: 60,
      role: 'Nursing Professionals & Paramedics',
      yearsExperience: 4,
      city: 'Pune',
      state: 'Pune',
      preferredLocations: [],
    });
  });
  it('no profile and no upload: null', () => {
    expect(toMatchProfile({ id: 'c', cvSource: null, profile: null })).toBeNull();
    expect(toMatchProfile(undefined)).toBeNull();
  });
});
