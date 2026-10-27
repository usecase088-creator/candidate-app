// The website's validateWizardStep (candidates/src/lib/validations.ts), same messages, same order.
import { emptyDraft, type Draft } from '../model';
import { validateStep } from '../validation';

const DOCTOR =
  'Clinical Practitioners & Super Specialists (MBBS/ MD Physician/ MD/MS / DM / MCh / DNB-SS etc)';
const NURSE = 'Nursing Professionals & Paramedics';
const draft = (over: Partial<Draft> = {}): Draft => ({ ...emptyDraft(), ...over });
const THIS_YEAR = new Date().getFullYear();

describe('step 0: basic details', () => {
  const ok = draft({ fullName: 'Dr A', email: 'a@b.co', phone: '9876543210', state: 'Kerala' });
  it('passes with name, email, phone and state', () => expect(validateStep(0, ok)).toBeNull());
  it('needs a name', () => expect(validateStep(0, { ...ok, fullName: ' ' })).toBe('Full name is required'));
  it('needs a valid email', () =>
    expect(validateStep(0, { ...ok, email: 'nope' })).toBe('Enter a valid email'));
  it('needs a 10-digit phone', () =>
    expect(validateStep(0, { ...ok, phone: '12345' })).toBe('Enter a valid 10-digit phone number'));
  it('rejects letters in the phone', () =>
    expect(validateStep(0, { ...ok, phone: '98765abcde' })).toBe(
      'Phone number can only contain digits and + - ( )',
    ));
  it('needs a state', () => expect(validateStep(0, { ...ok, state: '' })).toBe('Please select your state'));
  it('checks the social link', () =>
    expect(validateStep(0, { ...ok, linkedinUrl: 'not a url' })).toBe('Enter a valid public profile URL'));
  it('accepts an empty social link and a link without https', () => {
    expect(validateStep(0, { ...ok, linkedinUrl: '' })).toBeNull();
    expect(validateStep(0, { ...ok, linkedinUrl: 'linkedin.com/in/x' })).toBeNull();
  });
});

describe('step 1: medical work profile', () => {
  it('needs a role', () => expect(validateStep(1, draft())).toBe('Role is required'));
  it('limits years of experience', () => {
    expect(validateStep(1, draft({ role: NURSE, yearsExperience: -1 }))).toBe(
      'Years of experience must be 0 or more',
    );
    expect(validateStep(1, draft({ role: NURSE, yearsExperience: 61 }))).toBe(
      'Years of experience seems too high — check the value',
    );
  });
  it('doctors and dentists need a specialty', () => {
    expect(validateStep(1, draft({ role: DOCTOR }))).toBe('Primary specialty is required');
    expect(validateStep(1, draft({ role: 'Dentist and Super specialists (BDS/MDS)' }))).toBe(
      'Primary specialty is required',
    );
    expect(validateStep(1, draft({ role: DOCTOR, specialty: 'Cardiology' }))).toBeNull();
  });
  it('nurses do not', () => expect(validateStep(1, draft({ role: NURSE }))).toBeNull());
});

describe('step 2: registration', () => {
  it('doctors need council, number and licence status', () => {
    expect(validateStep(2, draft({ role: DOCTOR, licenseStatus: 'Active' }))).toBe(
      'Registration council is required',
    );
    expect(validateStep(2, draft({ role: DOCTOR, registrationCouncil: 'NMC' }))).toBe(
      'Registration number is required',
    );
    expect(
      validateStep(
        2,
        draft({ role: DOCTOR, registrationCouncil: 'NMC', registrationNumber: '1', licenseStatus: '' }),
      ),
    ).toBe('License status is required');
  });
  it('nurses need the INC number', () =>
    expect(validateStep(2, draft({ role: NURSE }))).toBe('INC registration number is required'));
});

describe('step 3: qualifications', () => {
  it('needs one', () => expect(validateStep(3, draft())).toBe('Add at least one qualification'));
  it('checks each row', () => {
    const q = { degree: 'MBBS', institution: 'X', year: '2012' };
    expect(validateStep(3, draft({ qualifications: [{ ...q, degree: '' }] }))).toBe(
      'Qualification 1: degree is required',
    );
    expect(validateStep(3, draft({ qualifications: [q, { ...q, institution: '' }] }))).toBe(
      'Qualification 2: institution is required',
    );
    expect(validateStep(3, draft({ qualifications: [{ ...q, year: '' }] }))).toBe(
      'Qualification 1: year is required',
    );
    expect(validateStep(3, draft({ qualifications: [{ ...q, year: '1949' }] }))).toBe(
      'Qualification 1: enter a valid 4-digit year',
    );
    expect(validateStep(3, draft({ qualifications: [{ ...q, year: String(THIS_YEAR + 1) }] }))).toBe(
      'Qualification 1: enter a valid 4-digit year',
    );
    expect(validateStep(3, draft({ qualifications: [q] }))).toBeNull();
  });
});

describe('step 4: experience', () => {
  const ex = {
    role: 'Consultant',
    hospital: 'AMRI',
    city: 'Kolkata',
    start: '2020-01-01',
    end: '2021-01-01',
    summary: '',
    current: false,
    specialty: 'Cardiology',
    hospitalType: '',
    department: '',
    patientLoad: '',
    rota: '',
    keyProcedures: [],
  };
  it('needs one', () => expect(validateStep(4, draft())).toBe('Add at least one work experience'));
  it('needs role, hospital, city', () => {
    expect(validateStep(4, draft({ experience: [{ ...ex, role: '' }] }))).toBe(
      'Experience 1: role is required',
    );
    expect(validateStep(4, draft({ experience: [{ ...ex, hospital: '' }] }))).toBe(
      'Experience 1: hospital is required',
    );
    expect(validateStep(4, draft({ experience: [{ ...ex, city: '' }] }))).toBe(
      'Experience 1: city is required',
    );
  });
  it('checks the dates', () => {
    expect(validateStep(4, draft({ experience: [{ ...ex, start: '' }] }))).toBe(
      'Experience 1: Start date is required',
    );
    expect(validateStep(4, draft({ experience: [{ ...ex, start: 'soon' }] }))).toBe(
      'Experience 1: Enter a valid start date',
    );
    expect(validateStep(4, draft({ experience: [{ ...ex, start: '2999-01-01' }] }))).toBe(
      'Experience 1: Start date cannot be in the future',
    );
    expect(validateStep(4, draft({ experience: [{ ...ex, end: '2019-01-01' }] }))).toBe(
      'Experience 1: End date cannot be before start date',
    );
    expect(validateStep(4, draft({ experience: [{ ...ex, end: '2999-01-01' }] }))).toBe(
      'Experience 1: End date cannot be in the future',
    );
    expect(validateStep(4, draft({ experience: [{ ...ex, end: 'x' }] }))).toBe(
      'Experience 1: Enter a valid end date, or mark as current role',
    );
    expect(validateStep(4, draft({ experience: [{ ...ex, end: '', current: true }] }))).toBeNull();
  });
  it('doctors need the specialty on each position', () =>
    expect(validateStep(4, draft({ role: DOCTOR, experience: [{ ...ex, specialty: '' }] }))).toBe(
      'Experience 1: specialty or department focus is required',
    ));
});

describe('later steps', () => {
  it('step 5 needs a clinical skill', () =>
    expect(validateStep(5, draft())).toBe('Add at least one clinical skill'));
  it('step 6 procedures', () => {
    expect(validateStep(6, draft({ procedures: [{ name: 'X', count: -1 }] }))).toBe(
      'Procedure 1: count must be 0 or more',
    );
    expect(validateStep(6, draft({ procedures: [{ name: ' ', count: 3 }] }))).toBe(
      'Procedure 1: enter a procedure name',
    );
    expect(validateStep(6, draft({ procedures: [{ name: ' ', count: 0 }] }))).toBeNull();
  });
  it('step 7 publications and numbers', () => {
    const p = { title: 'T', authors: '', journal: 'J', year: '2020', doi: '', citations: 0 };
    expect(validateStep(7, draft({ publicationDetails: [{ ...p, title: '', authors: 'A' }] }))).toBe(
      'Publication 1: title is required',
    );
    expect(validateStep(7, draft({ publicationDetails: [{ ...p, journal: '' }] }))).toBe(
      'Publication 1: journal or venue is required',
    );
    expect(validateStep(7, draft({ publicationDetails: [{ ...p, year: '20' }] }))).toBe(
      'Publication 1: enter a valid publication year',
    );
    expect(validateStep(7, draft({ publicationDetails: [{ ...p, citations: -2 }] }))).toBe(
      'Publication 1: citations must be 0 or more',
    );
    expect(validateStep(7, draft({ hIndex: 'x' }))).toBe('h-index must be a whole number');
    expect(
      validateStep(7, draft({ publicationDetails: [{ ...p, title: '', journal: '', year: '' }] })),
    ).toBeNull();
  });
  it('step 8 highlights need a title', () =>
    expect(
      validateStep(
        8,
        draft({ professionalHighlights: [{ category: 'Award', title: '', detail: 'x', year: '' }] }),
      ),
    ).toBe('Highlight 1: title is required'));
  it('step 11 salary', () => {
    expect(validateStep(11, draft({ expectedSalaryMin: 10, expectedSalaryMax: 5 }))).toBe(
      'Minimum expected salary cannot exceed maximum',
    );
    expect(validateStep(11, draft({ currentSalaryMin: 10, currentSalaryMax: 5 }))).toBe(
      'Minimum current salary cannot exceed maximum',
    );
    expect(validateStep(11, draft())).toBeNull();
  });
  it('step 13 summary', () => {
    expect(validateStep(13, draft())).toBe('Professional summary is required');
    expect(validateStep(13, draft({ summary: 'too short' }))).toBe(
      'Professional summary should be at least 40 characters',
    );
    expect(validateStep(13, draft({ summary: 'x'.repeat(40) }))).toBeNull();
  });
  it('steps without rules pass', () => {
    for (const i of [9, 10, 12, 14, 15]) expect(validateStep(i, draft())).toBeNull();
  });
});
