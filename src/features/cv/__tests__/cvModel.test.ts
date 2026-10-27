import { buildCv } from '../cvModel';
import { buildCvHtml } from '../cvHtml';

const profile = {
  name: 'Dr. Ananya Sengupta',
  headline: 'Consultant Cardiologist · 7 years experience',
  email: 'ananya@example.test',
  phone: '9830012345',
  city: 'Kolkata',
  state: 'West Bengal',
  grade: 'Consultant',
  specialty: 'Cardiology',
  role: 'Clinical Practitioners & Super Specialists (MBBS/ MD Physician/ MD/MS / DM / MCh / DNB-SS etc)',
  summary: 'DM Cardiology with 7 years of practice.',
  registrationNumber: 'WBMC/2017/45821',
  registrationCouncil: 'West Bengal Medical Council',
  licenseStatus: 'Active',
  yearsExperience: 7,
  qualifications: [{ degree: 'DM Cardiology', institution: 'PGIMER', year: '2019' }],
  experience: [
    {
      role: 'Consultant Cardiologist',
      hospital: 'AMRI Hospitals',
      city: 'Kolkata',
      start: '2021-08-01',
      end: '',
      current: true,
      specialty: 'Interventional Cardiology',
      summary: 'Leads the cath lab.',
      keyProcedures: ['PTCA'],
    },
  ],
  clinicalSkills: ['PTCA', 'Echocardiography'],
  technicalSkills: ['EPIC EMR'],
  procedures: [{ name: 'Angiography', count: 850 }],
  certifications: [{ name: 'ACLS', issuer: 'AHA', year: '2024' }],
  publicationDetails: [
    {
      title: 'Primary PCI outcomes',
      authors: 'Sengupta A.',
      journal: 'Indian Heart Journal',
      year: '2023',
      doi: '10.1/x',
      citations: 18,
    },
  ],
  professionalHighlights: [{ category: 'Teaching', title: 'ECG sessions', detail: 'Weekly', year: '2022' }],
  languages: ['English', 'Bengali'],
  availability: '30 days notice',
  expectedSalaryMin: 32,
  expectedSalaryMax: 48,
  preferredRoleTypes: ['Full-time'],
};

describe('buildCv', () => {
  const cv = buildCv(profile);

  it('has the header the website shows', () => {
    expect(cv.name).toBe('Dr. Ananya Sengupta');
    expect(cv.titleLine).toBe('Consultant · Cardiology');
    expect(cv.contact).toEqual(['ananya@example.test', '9830012345', 'West Bengal']);
  });

  it('counts experience, procedures, publications and citations', () => {
    expect(cv.metrics).toEqual([
      ['Experience', '7+ yrs'],
      ['Procedure volume', '850+'],
      ['Publications', '1'],
      ['Citations', '18'],
    ]);
  });

  it('writes the experience period like the website (Aug 2021 - Present)', () => {
    const exp = cv.sections.find((s) => s.title === 'Clinical Experience')!;
    expect(exp.items[0]?.tag).toMatch(/Aug 2021 - Present/);
    expect(exp.items[0]?.heading).toBe('Consultant Cardiologist');
    expect(exp.items[0]?.sub).toBe('AMRI Hospitals · Kolkata');
  });

  it('lists the website sections in order and leaves out empty ones', () => {
    expect(cv.sections.map((s) => s.title)).toEqual([
      'Clinical Experience',
      'Publications & Citations',
      'Procedure Exposure',
      'Audit, Teaching & Leadership',
      'Registration',
      'Education',
      'Clinical Skills',
      'Certifications',
      'Systems',
      'Languages',
      'Availability',
    ]);
    const sparse = buildCv({ name: 'A' });
    expect(sparse.sections.map((s) => s.title)).toEqual(['Availability']);
  });

  it('formats the expected salary as the website does', () => {
    const a = cv.sections.find((s) => s.title === 'Availability')!;
    expect(a.items.map((i) => i.heading)).toContain('Expected: ₹32–48 LPA');
  });

  it('falls back to the legacy publication list and sums citations when no total is given', () => {
    const c = buildCv({ name: 'A', publications: ['Old paper'] });
    expect(c.metrics.find((m) => m[0] === 'Publications')?.[1]).toBe('1');
    expect(c.sections.find((s) => s.title === 'Publications & Citations')?.items[0]?.heading).toBe(
      'Old paper',
    );
  });

  it('survives wrong types from the server', () => {
    expect(() =>
      buildCv({ name: 5, experience: 'x', procedures: [null, { name: 3 }], languages: [1] }),
    ).not.toThrow();
  });
});

describe('buildCvHtml', () => {
  it('is a complete page with the name and the sections', () => {
    const html = buildCvHtml(buildCv(profile));
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Dr. Ananya Sengupta');
    expect(html).toContain('Clinical Experience');
    expect(html).toContain('AMRI Hospitals');
  });

  it('escapes anything a user typed, so a name cannot add markup or scripts to the PDF', () => {
    const html = buildCvHtml(
      buildCv({
        name: '<script>alert(1)</script>',
        summary: 'a & b "c"',
        clinicalSkills: ['<img src=x onerror=1>'],
      }),
    );
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a &amp; b &quot;c&quot;');
  });
});
