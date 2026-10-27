import { applicantMe } from '@/test/fixtures/applications';

import { computeCompleteness, draftFromMe, emptyDraft, profileFromDraft } from '../model';

const me = applicantMe as never;
const DOCTOR =
  'Clinical Practitioners & Super Specialists (MBBS/ MD Physician/ MD/MS / DM / MCh / DNB-SS etc)';

describe('draftFromMe', () => {
  it('takes the login phone and email from the account, not from the saved profile (B8)', () => {
    const d = draftFromMe({
      ...applicantMe,
      phone: '9111111111',
      email: 'login@x.test',
      profile: { ...applicantMe.profile, phone: '9222222222' },
    } as never);
    expect(d.phone).toBe('9111111111');
    expect(d.email).toBe('login@x.test');
  });
  it('starts empty for a candidate with no profile', () => {
    const d = draftFromMe({
      id: 'c',
      name: 'New One',
      email: 'n@x.test',
      phone: '9000000000',
      profile: null,
    } as never);
    expect(d.fullName).toBe('New One');
    expect(d.qualifications).toEqual([]);
    expect(d.availability).toBe('30 days notice');
    expect(d.licenseStatus).toBe('Active');
  });
  it('reads the saved profile', () => {
    expect(draftFromMe(me).fullName).toBe('Demo Applicant');
  });
});

describe('profileFromDraft', () => {
  const base = { ...applicantMe.profile, someOtherKey: 'keep me', avatarUrl: 'https://x/a.jpg' };
  it('sends back keys it does not edit, unchanged', () => {
    const p = profileFromDraft(
      { ...emptyDraft(), fullName: 'Dr X', email: 'e@x.test', phone: '9000000000' },
      base,
    );
    expect(p.someOtherKey).toBe('keep me');
    expect(p.avatarUrl).toBe('https://x/a.jpg');
  });
  it('computes headline, initials, completeness and verified like the website', () => {
    const d = {
      ...emptyDraft(),
      fullName: 'Dr. Ananya Sengupta',
      email: 'e@x.test',
      phone: '9000000000',
      state: 'West Bengal',
      role: DOCTOR,
      grade: 'Consultant',
      specialty: 'Cardiology',
      yearsExperience: 7,
      registrationNumber: 'WB/1',
      licenseStatus: 'Active',
    };
    const p = profileFromDraft(d, {});
    expect(p.avatar).toBe('AS');
    expect(p.headline).toBe('Consultant Cardiology · 7 years experience');
    expect(p.verified).toBe(true);
    expect(p.completeness).toBe(computeCompleteness(p));
    expect(p.city).toBe('West Bengal');
  });
  it('falls back to "Healthcare Professional" for an empty name (website)', () => {
    expect(profileFromDraft(emptyDraft(), {}).name).toBe('Healthcare Professional');
  });
  it('drops empty rows and merges publication details into the legacy list', () => {
    const d = {
      ...emptyDraft(),
      qualifications: [
        { degree: '', institution: '', year: '' },
        { degree: 'MBBS', institution: 'X', year: '2012' },
      ],
      procedures: [
        { name: ' ', count: 0 },
        { name: 'PTCA', count: 5 },
      ],
      publicationDetails: [{ title: 'T', authors: 'A', journal: 'J', year: '2020', doi: '', citations: 2 }],
    };
    const p = profileFromDraft(d, {});
    expect(p.qualifications).toHaveLength(1);
    expect(p.procedures).toEqual([{ name: 'PTCA', count: 5 }]);
    expect((p.publications as string[])[0]).toContain('T');
  });
  it('clears the end date of a current role', () => {
    const ex = {
      role: 'R',
      hospital: 'H',
      city: 'C',
      start: '2020-01-01',
      end: '2021-01-01',
      summary: '',
      current: true,
      specialty: '',
      hospitalType: '',
      department: '',
      patientLoad: '',
      rota: '',
      keyProcedures: [],
    };
    const p = profileFromDraft({ ...emptyDraft(), experience: [ex] }, {});
    expect((p.experience as { end: string }[])[0]?.end).toBe('');
  });
});

describe('computeCompleteness', () => {
  it('is 0 for an empty profile and 100 when every check passes', () => {
    expect(computeCompleteness({})).toBe(0);
    const full = {
      name: 'a',
      email: 'a',
      phone: 'a',
      state: 's',
      registrationNumber: 'r',
      specialty: 's',
      grade: 'g',
      licenseStatus: 'Active',
      summary: 's',
      qualifications: [1],
      experience: [1],
      clinicalSkills: ['x'],
      procedures: [1],
      certifications: [1],
      publications: ['p'],
      documentChecklist: ['d'],
      languages: ['l'],
    };
    expect(computeCompleteness(full)).toBe(100);
  });
});
