import { govFilter } from '../gov';
import { countriesOf, intlFilter, visaTone } from '../intl';

const gov = [
  { id: '1', examAuthority: 'AIIMS', name: 'Nursing Officer', link: 'x' },
  { id: '2', examAuthority: 'UPSC', name: 'Medical Officer', link: 'x', lastDate: '2026-12-01' },
];

describe('govFilter: authority or exam name, lower-case includes', () => {
  it('empty search returns all', () => expect(govFilter(gov, '  ')).toHaveLength(2));
  it('matches authority or name', () => {
    expect(govFilter(gov, 'aiims').map((j) => j.id)).toEqual(['1']);
    expect(govFilter(gov, 'MEDICAL').map((j) => j.id)).toEqual(['2']);
    expect(govFilter(gov, 'zzz')).toEqual([]);
  });
});

const intl = [
  {
    id: '1',
    jobPosition: 'Staff Nurse',
    specialty: 'ICU',
    city: 'London',
    country: 'United Kingdom',
    countryFlag: '🇬🇧',
    qualification: 'B.Sc',
    license: 'NMC',
    visaSponsorship: 'Sponsorship',
  },
  {
    id: '2',
    jobPosition: 'Pharmacist',
    specialty: 'Retail',
    city: 'Dubai',
    country: 'UAE',
    countryFlag: '🇦🇪',
    qualification: 'B.Pharm',
    license: 'DHA',
    visaSponsorship: 'Employer',
  },
];

describe('intl', () => {
  it('countriesOf: "All" + sorted distinct countries', () => {
    expect(countriesOf(intl)).toEqual(['All', 'UAE', 'United Kingdom']);
  });
  it('intlFilter by country and by search over position, specialty, city, country, qualification, license', () => {
    expect(intlFilter(intl, '', 'UAE').map((j) => j.id)).toEqual(['2']);
    expect(intlFilter(intl, 'nmc', 'All').map((j) => j.id)).toEqual(['1']);
    expect(intlFilter(intl, 'b.pharm', 'All').map((j) => j.id)).toEqual(['2']);
    expect(intlFilter(intl, 'london', 'UAE')).toEqual([]);
  });
  // D32: the website's raw Tailwind visa colours become the app's semantic pill tones (the semantics stay the website's).
  it('visaTone: sponsored green, employer info, depends amber, self / not required / not sponsored grey, unknown amber', () => {
    expect(visaTone('Sponsorship')).toBe('success');
    expect(visaTone('Employer')).toBe('info');
    expect(visaTone('Depends')).toBe('warning');
    expect(visaTone('Self')).toBe('neutral');
    expect(visaTone('Not Required')).toBe('neutral');
    expect(visaTone('Not Sponsored')).toBe('neutral');
    expect(visaTone('No Sponsorship')).toBe('neutral');
    expect(visaTone('TBD')).toBe('warning');
    expect(visaTone('Something new')).toBe('warning');
    expect(visaTone('')).toBe('warning');
  });
});
