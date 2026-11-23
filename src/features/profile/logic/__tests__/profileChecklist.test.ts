import { profileChecklist } from '../profileChecklist';

const full = {
  email: 'a@b.test',
  phone: '9876500088',
  city: 'Kolkata',
  registrationNumber: 'WB/1',
  summary: 'Physician.',
  experience: [{ role: 'Consultant' }],
  qualifications: [{ degree: 'MBBS' }],
  clinicalSkills: ['Emergency Care'],
  certifications: [{ name: 'ACLS' }],
};

describe('profileChecklist (website routes/profile.tsx profileChecklist)', () => {
  it('lists the eight website items in the website order and wording', () => {
    expect(profileChecklist(full).map((i) => i.label)).toEqual([
      'Contact details',
      'Location',
      'Registration',
      'Professional summary',
      'Work experience',
      'Education',
      'Clinical skills',
      'Certifications',
    ]);
    expect(profileChecklist(full).every((i) => i.done)).toBe(true);
  });

  it('marks every item not done on an empty profile, and tolerates values of the wrong type', () => {
    expect(profileChecklist({}).some((i) => i.done)).toBe(false);
    expect(profileChecklist({ experience: 'x', clinicalSkills: null }).some((i) => i.done)).toBe(false);
  });

  it('needs both email and phone for Contact details; state or city for Location', () => {
    const contact = (p: Record<string, unknown>) => profileChecklist(p)[0]?.done;
    const location = (p: Record<string, unknown>) => profileChecklist(p)[1]?.done;
    expect(contact({ ...full, phone: '' })).toBe(false);
    expect(contact({ ...full, email: '' })).toBe(false);
    expect(location({ ...full, city: '', state: 'West Bengal' })).toBe(true);
    expect(location({ ...full, city: '', state: '' })).toBe(false);
  });

  it("each item opens the builder step that edits it", () => {
    expect(Object.fromEntries(profileChecklist(full).map((i) => [i.label, i.step]))).toEqual({
      'Contact details': 0,
      Location: 0,
      Registration: 2,
      'Professional summary': 13,
      'Work experience': 4,
      Education: 3,
      'Clinical skills': 5,
      Certifications: 9,
    });
  });
});
