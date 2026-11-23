// The Profile tab strength card checklist: website routes/profile.tsx `profileChecklist(c)`, same eight items, order,
// wording and done rules, read from the saved profile JSON (as the website reads its hydrated profile). Each item also
// carries the builder step that edits it, so a not-done item can open the builder there.
import type { ProfileJson } from '../builder/model';
import { SECTION_STEP } from './profileView';

export type ChecklistItem = { key: string; label: string; done: boolean; step: number };

const has = (v: unknown) => !!v;
const filled = (v: unknown) => Array.isArray(v) && v.length > 0;
/** Builder step 0, "Basic Details": contact and location. */
const BASIC_DETAILS_STEP = 0;

export function profileChecklist(p: ProfileJson): ChecklistItem[] {
  return [
    { key: 'contact', label: 'Contact details', done: has(p.email) && has(p.phone), step: BASIC_DETAILS_STEP },
    { key: 'location', label: 'Location', done: has(p.state) || has(p.city), step: BASIC_DETAILS_STEP },
    { key: 'registration', label: 'Registration', done: has(p.registrationNumber), step: SECTION_STEP.registration },
    { key: 'summary', label: 'Professional summary', done: has(p.summary), step: SECTION_STEP.about },
    { key: 'experience', label: 'Work experience', done: filled(p.experience), step: SECTION_STEP.experience },
    { key: 'education', label: 'Education', done: filled(p.qualifications), step: SECTION_STEP.education },
    {
      key: 'clinicalSkills',
      label: 'Clinical skills',
      done: filled(p.clinicalSkills),
      step: SECTION_STEP.clinicalSkills,
    },
    {
      key: 'certifications',
      label: 'Certifications',
      done: filled(p.certifications),
      step: SECTION_STEP.certifications,
    },
  ];
}
