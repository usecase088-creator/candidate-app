// Choice lists and the 16 steps of the profile form, copied from the website (ProfileFormWizard.tsx, data/categories.ts,
// data/states.ts). Wording is the website's.

export const ROLE_TYPES = [
  'Students, Interns, Residents & Trainees',
  'Clinical Practitioners & Super Specialists (MBBS/ MD Physician/ MD/MS / DM / MCh / DNB-SS etc)',
  'Dentist and Super specialists (BDS/MDS)',
  'Clinical Practioners (BHMS/BAMS/BUMS)-  AYUSH & Alternative Medicine',
  'Veterinary Practitioners and Specialist',
  'Nursing Professionals & Paramedics',
  'Biotechnologist, Genetics & Life Sciences speclist',
  'Physiotherapy and Rehabilitation Professionals',
  'Laboratory Technologist & Diagnostic Services',
  'Pharmacy & Pharmaceutical Professionals',
  'Hospital Administration & Management',
  'Dietician , Nutritionist and Wellness advisor',
  'Medical Education & Faculty (BSC/MSC/PHD)',
  'Clinical Research & Healthcare Research',
  'Pharmaceutical, Medical Devices & Healthcare Industry',
  'Emergency Medical Services (EMS)',
  'Public Health care workers',
  'Non-Clinical Healthcare Support Staff',
] as const;

export const isDoctor = (role?: string) =>
  String(role || '').includes('Clinical Practitioners & Super Specialists');
export const isDentist = (role?: string) => String(role || '').includes('Dentist and Super specialists');
export const isNurse = (role?: string) => String(role || '').includes('Nursing Professionals & Paramedics');

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman & Nicobar Islands',
  'Chandigarh',
  'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi (NCT)',
  'Jammu & Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export const DOCTOR_SPECIALTIES = [
  'General Medicine',
  'Cardiology',
  'Critical Care',
  'Emergency Medicine',
  'Radiology',
  'Orthopedics',
  'Pediatrics',
  'Obstetrics & Gynaecology',
  'Anaesthesia',
  'General Surgery',
  'Neurology',
  'Dermatology',
];
export const DENTIST_SPECIALTIES = ['Dental Surgery', 'Endodontics', 'Orthodontics', 'Prosthodontics'];
export const OTHER_SPECIALTIES = ['ICU', 'OT', 'Radiology', 'Laboratory', 'Hospital Ops'];

export const GRADE_OPTIONS = [
  'Intern',
  'Junior Resident',
  'Senior Resident',
  'Registrar',
  'Fellow',
  'Associate Consultant',
  'Consultant',
  'Senior Consultant',
  'Professor',
];
export const WORK_MODE_OPTIONS = [
  'Full-time',
  'Part-time',
  'Locum',
  'Visiting consultant',
  'Teleconsultation',
  'Academic / teaching',
];
export const LICENSE_STATUS_OPTIONS = ['Active', 'Provisional', 'Renewal pending', 'Inactive'];
export const SPECIALIST_REGISTER_OPTIONS = [
  'Not applicable',
  'Specialist registered',
  'Eligible / in process',
  'Not specialist registered',
];
export const RIGHT_TO_WORK_OPTIONS = [
  'Indian citizen',
  'OCI / PIO',
  'Work visa',
  'Employer sponsorship required',
  'Prefer not to say',
];
export const DOCUMENT_OPTIONS = [
  'Medical registration certificate',
  'MBBS / primary medical degree',
  'Postgraduate degree certificates',
  'Specialty fellowship / training proof',
  'ACLS/BLS/ALS certificate',
  'Indemnity / malpractice cover',
  'Right-to-work proof',
  'Passport / government ID',
  'Police verification / DBS',
  'References',
];
export const HIGHLIGHT_CATEGORIES = ['Audit / QI', 'Teaching', 'Leadership', 'Award'];
export const AVAILABILITY_OPTIONS = [
  'Immediately',
  '15 days notice',
  '30 days notice',
  '60 days notice',
  '90 days notice',
];
export const AVAILABILITY_STATUS_OPTIONS = [
  'Immediate Joiner',
  'Serving Notice Period',
  'Open to Opportunities',
];

export type StepMeta = { label: string; description: string; optional?: boolean };

export const STEPS: readonly StepMeta[] = [
  {
    label: 'Basic Details',
    description: 'Contact and location details recruiters need before clinical review.',
  },
  {
    label: 'Medical Work Profile',
    description: 'Specialty, grade and preferred appointment types for doctor matching.',
  },
  {
    label: 'Registration & Compliance',
    description: 'License, council, specialist register, indemnity and work eligibility.',
  },
  {
    label: 'Qualifications & Training',
    description: 'Medical degree, postgraduate training, fellowships and institutional history.',
  },
  {
    label: 'Clinical Experience',
    description: 'A structured clinical timeline with rota, hospital type and patient-load context.',
  },
  {
    label: 'Clinical Skills',
    description: 'Specialty skills and clinical areas that should surface in search and CV review.',
  },
  {
    label: 'Procedures',
    description: 'Procedure volumes and hands-on exposure for high-signal doctor profiles.',
    optional: true,
  },
  {
    label: 'Research & Citations',
    description: 'Publications, citation counts, h-index and academic profile links.',
    optional: true,
  },
  {
    label: 'Audit, Teaching & Leadership',
    description: 'Quality improvement, teaching, awards and leadership work recruiters value.',
    optional: true,
  },
  {
    label: 'Certifications',
    description: 'Life-support, specialty, equipment and professional certifications.',
    optional: true,
  },
  {
    label: 'Availability & Preferences',
    description: 'Notice period and work preferences for faster shortlisting.',
    optional: true,
  },
  { label: 'Salary Expectations', description: 'Expected range for transparent role matching.' },
  {
    label: 'Languages',
    description: 'Languages used in patient care, ward communication and documentation.',
    optional: true,
  },
  {
    label: 'Professional Summary',
    description: 'A concise clinician summary that appears near the top of the generated CV.',
  },
  {
    label: 'Document Vault',
    description: 'Track verification-ready documents and attach supporting files where needed.',
    optional: true,
  },
  {
    label: 'Review & Submit',
    description: 'Final quality check before saving or submitting your application.',
  },
];

export const LAST_STEP = STEPS.length - 1;
