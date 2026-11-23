import { type Draft, emptyDraft } from '../model';
import { builderReadiness } from '../readiness';

// Website ProfileFormWizard `computeDoctorReadiness`: ten checks on the form state, rounded percent, the first three
// that fail as "Next best fixes".
const full = (): Draft => ({
  ...emptyDraft(),
  fullName: 'Dr. A',
  email: 'a@x.test',
  phone: '9000000000',
  specialty: 'Cardiology',
  registrationNumber: 'WB/1',
  registrationCouncil: 'NMC',
  licenseStatus: 'Active',
  qualifications: [{ degree: 'MBBS', institution: 'CMC', year: '2012' }],
  experience: [
    {
      role: 'Consultant',
      hospital: 'AMRI',
      city: '',
      start: '',
      end: '',
      summary: '',
      specialty: '',
      hospitalType: '',
      department: '',
      patientLoad: '',
      rota: '',
      keyProcedures: [],
    },
  ],
  clinicalSkills: ['PTCA'],
  procedures: [{ name: 'PCI', count: 10 }],
  publications: ['A note'],
  documentChecklist: ['Medical degree certificate'],
  summary: 'Consultant cardiologist with seven years of tertiary care.',
});

describe('builderReadiness (website computeDoctorReadiness)', () => {
  it('a complete form is 100% with nothing missing', () => {
    expect(builderReadiness(full())).toEqual({ score: 100, missing: [] });
  });

  it('an empty form: only the default licence status is set, so 0%; the first three fixes in website order', () => {
    expect(builderReadiness(emptyDraft())).toEqual({
      score: 0,
      missing: ['Add contact details', 'Select specialty', 'Add active registration details'],
    });
  });

  it('each check is worth 10 points and the fixes keep the website order', () => {
    expect(builderReadiness({ ...full(), procedures: [], documentChecklist: [] })).toEqual({
      score: 80,
      missing: ['Add procedure exposure', 'Mark verification documents ready'],
    });
  });

  it('contact needs name, email and phone; registration needs number, council and status', () => {
    expect(builderReadiness({ ...full(), phone: '' }).missing).toEqual(['Add contact details']);
    expect(builderReadiness({ ...full(), registrationCouncil: '' }).missing).toEqual([
      'Add active registration details',
    ]);
  });

  it('research counts publication details, citation strings or a citation total', () => {
    const none = { ...full(), publications: [], publicationDetails: [], totalCitations: '' };
    expect(builderReadiness(none).missing).toEqual(['Add publications or citation metrics']);
    expect(builderReadiness({ ...none, totalCitations: '12' }).missing).toEqual([]);
  });

  it('the summary counts from 40 characters (trimmed), like the website', () => {
    expect(builderReadiness({ ...full(), summary: `${'x'.repeat(39)}   ` }).missing).toEqual([
      'Write a professional summary',
    ]);
    expect(builderReadiness({ ...full(), summary: 'x'.repeat(40) }).missing).toEqual([]);
  });

  it('rows count as soon as they are added, even empty (website checks the list length)', () => {
    const d = { ...full(), qualifications: [{ degree: '', institution: '', year: '' }] };
    expect(builderReadiness(d).score).toBe(100);
  });
});
