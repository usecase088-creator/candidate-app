import type { Job } from '@/api/schemas/jobs';
import { publicJob } from '@/test/fixtures/jobs';

import {
  activeFilterCount,
  applyFilters,
  categoriesOf,
  citiesOf,
  DEFAULT_FILTERS,
  type FilterState,
  jobMatchesSearch,
  SORT_LABELS,
} from '../filter';

const job = (over: Partial<Job>): Job => ({
  ...(publicJob as unknown as Job),
  tags: [],
  responsibilities: [],
  requirements: [],
  perks: [],
  postedDays: 0,
  ...over,
});

const nurse = job({
  id: 'n',
  role: 'Staff Nurse',
  city: 'Kolkata',
  category: 'Nurses',
  salaryMax: 4.5,
  postedDays: 2,
  type: 'Full-time',
  experienceMin: 1,
  experienceMax: 5,
  matchPercent: 60,
});
const doctor = job({
  id: 'd',
  role: 'Cardiologist',
  specialty: 'Cardiology',
  city: 'Bengaluru',
  location: 'Bengaluru, Karnataka',
  category: 'Doctors',
  salaryMax: 40,
  postedDays: 0,
  type: 'Locum',
  experienceMin: 8,
  experienceMax: 15,
  matchPercent: 90,
  tags: ['DM'],
  description: '<p>Cath lab <b>lead</b></p>',
});
const tech = job({
  id: 't',
  role: 'Lab Technician',
  city: 'Pune',
  category: 'Technicians',
  salaryMax: 3,
  postedDays: 9,
  type: 'Part-time',
  experienceMin: 0,
  experienceMax: 2,
});
const jobs = [nurse, doctor, tech];

describe('jobMatchesSearch (website lib/jobSearch.ts)', () => {
  it('empty query and city match everything', () => {
    expect(jobMatchesSearch(nurse, '', '')).toBe(true);
    expect(jobMatchesSearch(nurse, '  ', '  ')).toBe(true);
  });
  it('is case-insensitive over role, specialty, hospital, location, city, category, type and tags', () => {
    expect(jobMatchesSearch(doctor, 'CARDIO', '')).toBe(true);
    expect(jobMatchesSearch(doctor, 'locum', '')).toBe(true);
    expect(jobMatchesSearch(doctor, 'dm', '')).toBe(true);
    expect(jobMatchesSearch(doctor, 'seed city', '')).toBe(true);
    expect(jobMatchesSearch(doctor, 'doctors', '')).toBe(true);
    expect(jobMatchesSearch(doctor, 'dentist', '')).toBe(false);
  });
  it('searches the description with HTML tags stripped', () => {
    expect(jobMatchesSearch(doctor, 'cath lab', '')).toBe(true);
    expect(jobMatchesSearch(doctor, 'lead', '')).toBe(true);
    expect(jobMatchesSearch(doctor, '<b>', '')).toBe(false);
  });
  it('city matches city + location', () => {
    expect(jobMatchesSearch(doctor, '', 'karnataka')).toBe(true);
    expect(jobMatchesSearch(doctor, '', 'bengal')).toBe(true);
    expect(jobMatchesSearch(nurse, '', 'bengaluru')).toBe(false);
  });
  it('needs both text and city', () => {
    expect(jobMatchesSearch(doctor, 'cardio', 'pune')).toBe(false);
  });
});

describe('applyFilters', () => {
  const run = (over: Partial<FilterState>) =>
    applyFilters(jobs, { query: '', city: '', category: null, ...DEFAULT_FILTERS, ...over }).map((j) => j.id);

  it('default: all jobs, latest first (postedDays ascending)', () => {
    expect(run({})).toEqual(['d', 'n', 't']);
  });
  it('cities (exact match on job.city)', () => {
    expect(run({ cities: ['Kolkata', 'Pune'] })).toEqual(['n', 't']);
  });
  it('minExp keeps jobs whose min OR max reaches it', () => {
    expect(run({ minExp: 6 })).toEqual(['d']);
    expect(run({ minExp: 5 })).toEqual(['d', 'n']);
    expect(run({ minExp: 3 })).toEqual(['d', 'n']);
  });
  it('minSalary uses salaryMax', () => {
    expect(run({ minSalary: 4 })).toEqual(['d', 'n']);
    expect(run({ minSalary: 10 })).toEqual(['d']);
  });
  it('types', () => {
    expect(run({ types: ['Locum', 'Part-time'] })).toEqual(['d', 't']);
  });
  it('category is exact', () => {
    expect(run({ category: 'Nurses' })).toEqual(['n']);
  });
  it('sort salary: salaryMax high to low', () => {
    expect(run({ sort: 'salary' })).toEqual(['d', 'n', 't']);
  });
  it('sort relevance: matchPercent high to low, missing last', () => {
    expect(run({ sort: 'relevance' })).toEqual(['d', 'n', 't']);
  });
  it('filters combine', () => {
    expect(run({ query: 'nurse', cities: ['Kolkata'], minSalary: 4, types: ['Full-time'] })).toEqual(['n']);
  });
  it('does not change the input list', () => {
    const copy = [...jobs];
    applyFilters(jobs, { query: '', city: '', category: null, ...DEFAULT_FILTERS, sort: 'salary' });
    expect(jobs).toEqual(copy);
  });
});

describe('lists for the filter UI', () => {
  it('citiesOf: distinct, sorted, no blanks', () => {
    expect(citiesOf([...jobs, job({ city: null }), job({ city: '' }), job({ city: 'Pune' })])).toEqual([
      'Bengaluru',
      'Kolkata',
      'Pune',
    ]);
  });
  it('categoriesOf: distinct real category values, sorted, no blanks', () => {
    expect(categoriesOf([...jobs, job({ category: null })])).toEqual(['Doctors', 'Nurses', 'Technicians']);
  });
});

describe('activeFilterCount and labels', () => {
  it('counts cities + types + each of minExp, minSalary and a non-default sort', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(
      activeFilterCount({ cities: ['A', 'B'], types: ['Locum'], minExp: 2, minSalary: 4, sort: 'salary' }),
    ).toBe(6);
  });
  it('sort labels are the website wording', () => {
    expect(SORT_LABELS).toEqual({
      latest: 'Latest roles',
      salary: 'Salary high to low',
      relevance: 'Profile relevance',
    });
  });
});
