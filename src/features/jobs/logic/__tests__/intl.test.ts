import { govFilter } from '../gov';
import { countriesOf, intlFilter, visaColors } from '../intl';

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
  it('visa badge colours are the website table, unknown values get the TBD grey', () => {
    expect(visaColors('Sponsorship')).toEqual({ bg: '#dcfce7', text: '#15803d' });
    expect(visaColors('Not Required')).toEqual({ bg: '#f1f5f9', text: '#475569' });
    expect(visaColors('Something new')).toEqual({ bg: '#f1f5f9', text: '#94a3b8' });
  });
});
