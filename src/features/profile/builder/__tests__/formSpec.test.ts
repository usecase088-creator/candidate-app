import { type Block, type FieldSpec, stepBlocks } from '../formSpec';
import { type Draft, emptyDraft } from '../model';
import { ROLE_TYPES } from '../options';

const DOCTOR = ROLE_TYPES[1];
const DENTIST = ROLE_TYPES[2];
const NURSE = ROLE_TYPES[5];
const PHYSIO = ROLE_TYPES[7];

/** The chips field `key` of a step (top-level fields, or the fields of a list row). */
function chipField(step: number, key: string, over: Partial<Draft> = {}): FieldSpec | undefined {
  const draft = { ...emptyDraft(), ...over };
  const fields = stepBlocks(step, draft).flatMap((b: Block) =>
    b.type === 'fields' ? b.fields : b.type === 'list' ? b.fields(b.empty()) : [],
  );
  return fields.find((f) => f.key === key);
}

// Website ProfileFormWizard `suggestions` on each ChipInput.
describe('formSpec chip suggestions (website ChipInput suggestions)', () => {
  it('primary specialty follows the role', () => {
    expect(chipField(1, 'specialty', { role: DOCTOR })?.suggestions?.[0]).toBe('General Medicine');
    expect(chipField(1, 'specialty', { role: DENTIST })?.suggestions).toEqual([
      'Dental Surgery',
      'Endodontics',
      'Orthodontics',
      'Prosthodontics',
    ]);
    expect(chipField(1, 'specialty', { role: PHYSIO })?.suggestions).toEqual([
      'ICU',
      'OT',
      'Radiology',
      'Laboratory',
      'Hospital Ops',
    ]);
  });

  it('key procedures in a clinical position', () => {
    expect(chipField(4, 'keyProcedures')?.suggestions).toEqual([
      'OPD',
      'ICU rounds',
      'Emergency calls',
      'Surgery assist',
      'Cath lab',
    ]);
  });

  it('clinical skills follow the role', () => {
    expect(chipField(5, 'clinicalSkills', { role: DOCTOR })?.suggestions).toEqual([
      'OPD Management',
      'ICU Care',
      'Emergency Medicine',
      'Echocardiography',
      'Perioperative Care',
    ]);
    expect(chipField(5, 'clinicalSkills', { role: NURSE })?.suggestions).toEqual([
      'IV Cannulation',
      'Wound Care',
      'Ventilator Care',
      'Triage',
    ]);
    expect(chipField(5, 'clinicalSkills', { role: DENTIST })?.suggestions).toEqual([
      'RCT',
      'Restorations',
      'Crowns',
      'Implants',
    ]);
    expect(chipField(5, 'clinicalSkills', { role: PHYSIO })?.suggestions).toEqual([
      'Sterilization',
      'Equipment Setup',
      'Patient Handling',
    ]);
  });

  it('technical skills', () => {
    expect(chipField(10, 'technicalSkills')?.suggestions).toEqual([
      'EMR',
      'PACS',
      'MS Excel',
      'Stata',
      'R',
      'Ultrasound console',
    ]);
  });

  it('languages', () => {
    expect(chipField(12, 'languages')?.suggestions).toEqual([
      'English',
      'Hindi',
      'Bengali',
      'Tamil',
      'Telugu',
      'Marathi',
      'Kannada',
    ]);
  });

  it('fields without website suggestions have none (publication notes, preferred locations)', () => {
    expect(chipField(7, 'publications')?.suggestions).toBeUndefined();
    expect(chipField(10, 'preferredLocations')?.suggestions).toBeUndefined();
  });
});
