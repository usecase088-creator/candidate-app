// What each of the 16 steps shows, as data: the screen draws any step from this. Labels, hints and required marks
// follow the website (ProfileFormWizard.tsx). Role changes labels and required fields like on the website.
import type { Draft, Experience } from './model';
import {
  AVAILABILITY_OPTIONS,
  AVAILABILITY_STATUS_OPTIONS,
  DENTIST_SPECIALTIES,
  DOCTOR_SPECIALTIES,
  DOCUMENT_OPTIONS,
  GRADE_OPTIONS,
  HIGHLIGHT_CATEGORIES,
  INDIAN_STATES,
  isDentist,
  isDoctor,
  isNurse,
  LICENSE_STATUS_OPTIONS,
  OTHER_SPECIALTIES,
  RIGHT_TO_WORK_OPTIONS,
  ROLE_TYPES,
  SPECIALIST_REGISTER_OPTIONS,
  WORK_MODE_OPTIONS,
} from './options';

export type FieldKind = 'text' | 'multiline' | 'number' | 'select' | 'multi' | 'chips' | 'readonly' | 'bool';

export type FieldSpec = {
  kind: FieldKind;
  key: string;
  label: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  options?: readonly string[];
  /** Quick picks for a chips field. */
  suggestions?: readonly string[];
  /** A chips field that holds one string, not a list (primary specialty). */
  single?: boolean;
  keyboard?: 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'url';
};

export type ListKey =
  | 'qualifications'
  | 'experience'
  | 'procedures'
  | 'publicationDetails'
  | 'professionalHighlights'
  | 'certifications';

export type Block =
  | { type: 'fields'; fields: FieldSpec[] }
  | {
      type: 'list';
      key: ListKey;
      /** "Qualification 1" */
      itemLabel: string;
      addLabel: string;
      empty: () => Record<string, unknown>;
      fields: (item: Record<string, unknown>) => FieldSpec[];
    };

const DATE_HINT = 'Use the format YYYY-MM-DD, for example 2021-08-01';

const emptyExperience = (): Experience => ({
  role: '',
  hospital: '',
  city: '',
  start: '',
  end: '',
  summary: '',
  current: false,
  specialty: '',
  hospitalType: '',
  department: '',
  patientLoad: '',
  rota: '',
  keyProcedures: [],
});

export function stepBlocks(step: number, s: Draft): Block[] {
  const doctor = isDoctor(s.role);
  const dentist = isDentist(s.role);
  const nurse = isNurse(s.role);
  switch (step) {
    case 0:
      return [
        {
          type: 'fields',
          fields: [
            { kind: 'text', key: 'fullName', label: 'Full name', required: true },
            {
              kind: 'readonly',
              key: 'email',
              label: 'Email',
              hint: 'This is your sign-in email. It cannot be changed here.',
            },
            {
              kind: 'readonly',
              key: 'phone',
              label: 'Phone',
              hint: 'This is your sign-in number. It cannot be changed here.',
            },
            { kind: 'text', key: 'city', label: 'City' },
            {
              kind: 'select',
              key: 'state',
              label: 'State',
              required: true,
              options: INDIAN_STATES,
              placeholder: 'Select your state',
            },
            {
              kind: 'text',
              key: 'linkedinUrl',
              label: 'Social profile',
              hint: 'Public profile URL (e.g. LinkedIn)',
              placeholder: 'https://www.linkedin.com/in/your-profile',
              keyboard: 'url',
            },
          ],
        },
      ];
    case 1:
      return [
        {
          type: 'fields',
          fields: [
            { kind: 'select', key: 'role', label: 'Role', required: true, options: ROLE_TYPES },
            { kind: 'number', key: 'yearsExperience', label: 'Years of experience', required: true },
            {
              kind: 'chips',
              key: 'specialty',
              label: 'Primary specialty',
              required: doctor || dentist,
              single: true,
              placeholder: 'Type specialty and press Add',
              suggestions: doctor ? DOCTOR_SPECIALTIES : dentist ? DENTIST_SPECIALTIES : OTHER_SPECIALTIES,
            },
            { kind: 'select', key: 'grade', label: 'Current grade', options: GRADE_OPTIONS },
            {
              kind: 'multi',
              key: 'preferredRoleTypes',
              label: 'Preferred role types',
              options: WORK_MODE_OPTIONS,
            },
          ],
        },
      ];
    case 2:
      return [
        {
          type: 'fields',
          fields: [
            {
              kind: 'text',
              key: 'registrationCouncil',
              label: dentist ? 'Dental Council' : nurse ? 'Nursing Council' : 'Medical Council',
              required: doctor || dentist,
              placeholder: 'e.g. National Medical Commission',
            },
            {
              kind: 'text',
              key: 'registrationNumber',
              label: dentist
                ? 'DCI registration number'
                : nurse
                  ? 'INC registration number'
                  : 'Registration number',
              required: doctor || dentist || nurse,
            },
            {
              kind: 'select',
              key: 'licenseStatus',
              label: 'License status',
              required: doctor || dentist,
              options: LICENSE_STATUS_OPTIONS,
            },
            {
              kind: 'select',
              key: 'specialistRegisterStatus',
              label: 'Specialist register status',
              options: SPECIALIST_REGISTER_OPTIONS,
            },
            {
              kind: 'text',
              key: 'revalidationDate',
              label: 'Revalidation / renewal date',
              hint: DATE_HINT,
              placeholder: 'YYYY-MM-DD',
            },
            {
              kind: 'text',
              key: 'indemnityProvider',
              label: 'Indemnity / malpractice cover',
              placeholder: 'Provider or policy reference',
            },
            { kind: 'select', key: 'rightToWork', label: 'Right to work', options: RIGHT_TO_WORK_OPTIONS },
            {
              kind: 'text',
              key: 'visaStatus',
              label: 'Visa / sponsorship notes',
              placeholder: 'e.g. Not applicable, sponsorship required',
            },
          ],
        },
      ];
    case 3:
      return [
        {
          type: 'list',
          key: 'qualifications',
          itemLabel: 'Qualification',
          addLabel: 'Add qualification',
          empty: () => ({ degree: '', institution: '', year: '' }),
          fields: () => [
            {
              kind: 'text',
              key: 'degree',
              label: 'Degree / training',
              required: true,
              placeholder: 'MBBS, MD, DM, DNB, Fellowship',
            },
            { kind: 'text', key: 'institution', label: 'Institution', required: true },
            {
              kind: 'text',
              key: 'year',
              label: 'Year completed',
              required: true,
              placeholder: 'e.g. 2018',
              keyboard: 'numeric',
            },
          ],
        },
      ];
    case 4:
      return [
        {
          type: 'list',
          key: 'experience',
          itemLabel: 'Experience',
          addLabel: 'Add experience',
          empty: () => ({ ...emptyExperience() }),
          fields: (item) => [
            { kind: 'text', key: 'role', label: 'Role / designation', required: true },
            { kind: 'text', key: 'hospital', label: 'Hospital / employer', required: true },
            { kind: 'text', key: 'city', label: 'City', required: true },
            {
              kind: 'text',
              key: 'hospitalType',
              label: 'Hospital type',
              placeholder: 'Tertiary care, teaching hospital, clinic',
            },
            {
              kind: 'text',
              key: 'specialty',
              label: 'Specialty / department focus',
              required: doctor,
              placeholder: 'e.g. Interventional cardiology',
            },
            {
              kind: 'text',
              key: 'department',
              label: 'Clinical setting',
              placeholder: 'OPD, ward, ICU, OT, cath lab',
            },
            {
              kind: 'text',
              key: 'start',
              label: 'Start date',
              required: true,
              hint: DATE_HINT,
              placeholder: 'YYYY-MM-DD',
            },
            { kind: 'bool', key: 'current', label: 'I currently work here' },
            ...(item.current
              ? []
              : [
                  {
                    kind: 'text',
                    key: 'end',
                    label: 'End date',
                    required: true,
                    hint: DATE_HINT,
                    placeholder: 'YYYY-MM-DD',
                  } satisfies FieldSpec,
                ]),
            {
              kind: 'text',
              key: 'patientLoad',
              label: 'Patient load / case mix',
              placeholder: 'e.g. 40 OPD patients/day, 12-bed ICU',
            },
            {
              kind: 'text',
              key: 'rota',
              label: 'Rota / on-call exposure',
              placeholder: 'e.g. 1:4 emergency rota, night shifts',
            },
            {
              kind: 'chips',
              key: 'keyProcedures',
              label: 'Key procedures in this role',
              placeholder: 'Add procedure and press Add',
            },
            {
              kind: 'multiline',
              key: 'summary',
              label: 'Clinical impact summary',
              placeholder:
                'Mention responsibilities, case complexity, outcomes, supervision and notable achievements.',
            },
          ],
        },
      ];
    case 5:
      return [
        {
          type: 'fields',
          fields: [
            {
              kind: 'chips',
              key: 'clinicalSkills',
              label: nurse ? 'Patient care & ward skills' : 'Clinical skills',
              required: true,
              placeholder: 'Type a skill and press Add',
            },
          ],
        },
      ];
    case 6:
      return [
        {
          type: 'list',
          key: 'procedures',
          itemLabel: 'Procedure',
          addLabel: 'Add procedure',
          empty: () => ({ name: '', count: 0 }),
          fields: () => [
            { kind: 'text', key: 'name', label: 'Procedure' },
            { kind: 'number', key: 'count', label: 'Count' },
          ],
        },
      ];
    case 7:
      return [
        {
          type: 'fields',
          fields: [
            { kind: 'text', key: 'totalCitations', label: 'Total citations', keyboard: 'numeric' },
            { kind: 'text', key: 'hIndex', label: 'h-index', keyboard: 'numeric' },
            { kind: 'text', key: 'i10Index', label: 'i10-index', keyboard: 'numeric' },
            {
              kind: 'text',
              key: 'scholarUrl',
              label: 'Google Scholar URL',
              placeholder: 'https://scholar.google.com/...',
              keyboard: 'url',
            },
            { kind: 'text', key: 'orcid', label: 'ORCID', placeholder: '0000-0000-0000-0000' },
          ],
        },
        {
          type: 'list',
          key: 'publicationDetails',
          itemLabel: 'Publication',
          addLabel: 'Add publication',
          empty: () => ({ title: '', authors: '', journal: '', year: '', doi: '', citations: 0 }),
          fields: () => [
            { kind: 'text', key: 'title', label: 'Publication title' },
            { kind: 'text', key: 'journal', label: 'Journal / conference' },
            { kind: 'text', key: 'year', label: 'Year', keyboard: 'numeric' },
            { kind: 'text', key: 'authors', label: 'Authors', placeholder: 'Keep your name visible' },
            { kind: 'text', key: 'doi', label: 'DOI / PMID' },
            { kind: 'number', key: 'citations', label: 'Citations' },
          ],
        },
        {
          type: 'fields',
          fields: [
            {
              kind: 'chips',
              key: 'publications',
              label: 'Additional publication notes',
              hint: 'Legacy citation strings',
              placeholder: 'Paste citation and press Add',
            },
          ],
        },
      ];
    case 8:
      return [
        {
          type: 'list',
          key: 'professionalHighlights',
          itemLabel: 'Highlight',
          addLabel: 'Add highlight',
          empty: () => ({ category: 'Audit / QI', title: '', detail: '', year: '' }),
          fields: () => [
            { kind: 'select', key: 'category', label: 'Category', options: HIGHLIGHT_CATEGORIES },
            { kind: 'text', key: 'title', label: 'Title', placeholder: 'e.g. Sepsis pathway audit' },
            { kind: 'text', key: 'year', label: 'Year', keyboard: 'numeric' },
            {
              kind: 'multiline',
              key: 'detail',
              label: 'Impact / detail',
              placeholder: 'Mention measurable outcomes, teaching responsibility, team size or recognition.',
            },
          ],
        },
      ];
    case 9:
      return [
        {
          type: 'list',
          key: 'certifications',
          itemLabel: 'Certification',
          addLabel: 'Add certification',
          empty: () => ({ name: '', issuer: '', year: '' }),
          fields: () => [
            {
              kind: 'text',
              key: 'name',
              label: 'Name',
              placeholder: 'ACLS, BLS, ATLS, ultrasound, fellowship',
            },
            { kind: 'text', key: 'issuer', label: 'Issuer' },
            { kind: 'text', key: 'year', label: 'Year', keyboard: 'numeric' },
          ],
        },
      ];
    case 10:
      return [
        {
          type: 'fields',
          fields: [
            {
              kind: 'select',
              key: 'availability',
              label: 'Availability / notice period',
              options: AVAILABILITY_OPTIONS,
            },
            {
              kind: 'chips',
              key: 'technicalSkills',
              label: 'Technical / software skills',
              placeholder: 'EMR, PACS, MS Excel...',
              suggestions: ['EMR', 'PACS', 'MS Excel', 'Stata', 'R', 'Ultrasound console'],
            },
            {
              kind: 'multi',
              key: 'preferredRoleTypes',
              label: 'Role preferences',
              options: WORK_MODE_OPTIONS,
            },
          ],
        },
      ];
    case 11:
      return [
        {
          type: 'fields',
          fields: [
            { kind: 'number', key: 'expectedSalaryMin', label: 'Expected salary, minimum (LPA)' },
            { kind: 'number', key: 'expectedSalaryMax', label: 'Expected salary, maximum (LPA)' },
            { kind: 'number', key: 'currentSalaryMin', label: 'Current salary, minimum (LPA)' },
            { kind: 'number', key: 'currentSalaryMax', label: 'Current salary, maximum (LPA)' },
            {
              kind: 'chips',
              key: 'preferredLocations',
              label: 'Preferred Job Locations',
              placeholder: 'Add preferred location (e.g. Mumbai, Remote)',
            },
            {
              kind: 'select',
              key: 'availabilityStatus',
              label: 'Availability Status',
              options: AVAILABILITY_STATUS_OPTIONS,
            },
          ],
        },
      ];
    case 12:
      return [
        {
          type: 'fields',
          fields: [{ kind: 'chips', key: 'languages', label: 'Languages', placeholder: 'Add language' }],
        },
      ];
    case 13:
      return [
        {
          type: 'fields',
          fields: [
            {
              kind: 'multiline',
              key: 'summary',
              label: 'Professional summary',
              required: true,
              hint: 'At least 40 characters; keep it clinical and specific',
              placeholder:
                'Example: Consultant cardiologist with 7 years of tertiary-care experience across cath lab, CCU and OPD.',
            },
          ],
        },
      ];
    case 14:
      return [
        {
          type: 'fields',
          fields: [
            {
              kind: 'multi',
              key: 'documentChecklist',
              label: 'Verification-ready documents',
              options: DOCUMENT_OPTIONS,
            },
          ],
        },
      ];
    default:
      return [];
  }
}
