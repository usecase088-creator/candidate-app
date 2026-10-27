// The profile form's state (the website's FormState in ProfileFormWizard.tsx) and the two conversions around it:
// saved profile → form, and form → the profile JSON the server stores. The server keeps the profile as loose JSON,
// so keys this form does not edit go back unchanged (see profileFromDraft).
import type { CandidateMe } from '@/api/schemas/candidate';

export type Experience = {
  role: string;
  hospital: string;
  city: string;
  start: string;
  end: string;
  summary: string;
  current?: boolean;
  specialty: string;
  hospitalType: string;
  department: string;
  patientLoad: string;
  rota: string;
  keyProcedures: string[];
};
export type Qualification = { degree: string; institution: string; year: string };
export type ProcedureRow = { name: string; count: number };
export type Certification = { name: string; issuer: string; year: string };
export type Publication = {
  title: string;
  authors: string;
  journal: string;
  year: string;
  doi: string;
  citations: number;
};
export type Highlight = { category: string; title: string; detail: string; year: string };

export type Draft = {
  fullName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  city: string;
  state: string;
  role: string;
  specialty: string;
  grade: string;
  preferredRoleTypes: string[];
  registrationNumber: string;
  registrationCouncil: string;
  licenseStatus: string;
  specialistRegisterStatus: string;
  revalidationDate: string;
  indemnityProvider: string;
  rightToWork: string;
  visaStatus: string;
  yearsExperience: number;
  qualifications: Qualification[];
  experience: Experience[];
  clinicalSkills: string[];
  technicalSkills: string[];
  procedures: ProcedureRow[];
  certifications: Certification[];
  publications: string[];
  publicationDetails: Publication[];
  totalCitations: string;
  hIndex: string;
  i10Index: string;
  scholarUrl: string;
  orcid: string;
  professionalHighlights: Highlight[];
  languages: string[];
  availability: string;
  expectedSalaryMin: number;
  expectedSalaryMax: number;
  currentSalaryMin: number;
  currentSalaryMax: number;
  preferredLocations: string[];
  availabilityStatus: string;
  summary: string;
  documentChecklist: string[];
};

/** The saved profile JSON: loose on purpose. */
export type ProfileJson = Record<string, unknown>;

export function emptyDraft(): Draft {
  return {
    fullName: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    city: '',
    state: '',
    role: '',
    specialty: '',
    grade: '',
    preferredRoleTypes: [],
    registrationNumber: '',
    registrationCouncil: '',
    licenseStatus: 'Active',
    specialistRegisterStatus: '',
    revalidationDate: '',
    indemnityProvider: '',
    rightToWork: '',
    visaStatus: '',
    yearsExperience: 0,
    qualifications: [],
    experience: [],
    clinicalSkills: [],
    technicalSkills: [],
    procedures: [],
    certifications: [],
    publications: [],
    publicationDetails: [],
    totalCitations: '',
    hIndex: '',
    i10Index: '',
    scholarUrl: '',
    orcid: '',
    professionalHighlights: [],
    languages: [],
    availability: '30 days notice',
    expectedSalaryMin: 0,
    expectedSalaryMax: 0,
    currentSalaryMin: 0,
    currentSalaryMax: 0,
    preferredLocations: [],
    availabilityStatus: '',
    summary: '',
    documentChecklist: [],
  };
}

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const rows = <T extends object>(v: unknown): Partial<T>[] =>
  Array.isArray(v) ? v.filter((x): x is Partial<T> => typeof x === 'object' && x !== null) : [];

/**
 * Saved profile → form. The login phone and email always come from the account, never from the profile JSON:
 * the website lets the profile's phone replace the login phone (B8), so the app never sends a different one.
 */
export function draftFromMe(me: CandidateMe): Draft {
  const p = (me.profile ?? {}) as ProfileJson;
  const d = emptyDraft();
  return {
    ...d,
    fullName: str(p.name) || str(me.name),
    email: str(me.email) || str(p.email),
    phone: str(me.phone) || str(p.phone),
    linkedinUrl: str(p.linkedinUrl),
    city: str(p.city),
    state: str(p.state) || str(p.city),
    role: str(p.role) || str(me.role),
    specialty: str(p.specialty),
    grade: str(p.grade),
    preferredRoleTypes: strs(p.preferredRoleTypes),
    registrationNumber: str(p.registrationNumber),
    registrationCouncil: str(p.registrationCouncil),
    licenseStatus: str(p.licenseStatus, 'Active'),
    specialistRegisterStatus: str(p.specialistRegisterStatus),
    revalidationDate: str(p.revalidationDate),
    indemnityProvider: str(p.indemnityProvider),
    rightToWork: str(p.rightToWork),
    visaStatus: str(p.visaStatus),
    yearsExperience: num(p.yearsExperience) || num(me.experienceYears),
    qualifications: rows<Qualification>(p.qualifications).map((q) => ({
      degree: str(q.degree),
      institution: str(q.institution),
      year: str(q.year),
    })),
    experience: rows<Experience>(p.experience).map((e) => ({
      role: str(e.role),
      hospital: str(e.hospital),
      city: str(e.city),
      start: str(e.start),
      end: e.current || e.end === 'Present' ? '' : str(e.end),
      summary: str(e.summary),
      current: Boolean(e.current) || e.end === 'Present',
      specialty: str(e.specialty),
      hospitalType: str(e.hospitalType),
      department: str(e.department),
      patientLoad: str(e.patientLoad),
      rota: str(e.rota),
      keyProcedures: strs(e.keyProcedures),
    })),
    clinicalSkills: strs(p.clinicalSkills),
    technicalSkills: strs(p.technicalSkills),
    procedures: rows<ProcedureRow>(p.procedures).map((r) => ({ name: str(r.name), count: num(r.count) })),
    certifications: rows<Certification>(p.certifications).map((c) => ({
      name: str(c.name),
      issuer: str(c.issuer),
      year: str(c.year),
    })),
    publications: strs(p.publications),
    publicationDetails: rows<Publication>(p.publicationDetails).map((x) => ({
      title: str(x.title),
      authors: str(x.authors),
      journal: str(x.journal),
      year: str(x.year),
      doi: str(x.doi),
      citations: num(x.citations),
    })),
    totalCitations: str(p.totalCitations),
    hIndex: str(p.hIndex),
    i10Index: str(p.i10Index),
    scholarUrl: str(p.scholarUrl),
    orcid: str(p.orcid),
    professionalHighlights: rows<Highlight>(p.professionalHighlights).map((h) => ({
      category: str(h.category, 'Audit / QI'),
      title: str(h.title),
      detail: str(h.detail),
      year: str(h.year),
    })),
    languages: strs(p.languages),
    availability: str(p.availability, '30 days notice'),
    expectedSalaryMin: num(p.expectedSalaryMin),
    expectedSalaryMax: num(p.expectedSalaryMax),
    currentSalaryMin: num(p.currentSalaryMin),
    currentSalaryMax: num(p.currentSalaryMax),
    preferredLocations: strs(p.preferredLocations),
    availabilityStatus: str(p.availabilityStatus),
    summary: str(p.summary),
    documentChecklist: strs(p.documentChecklist),
  };
}

const list = (v: unknown) => (Array.isArray(v) ? v : []);

/** Website `computeCompleteness` (data/profile.ts): 17 checks, rounded percent. */
export function computeCompleteness(p: ProfileJson): number {
  const checks = [
    !!p.name,
    !!p.email,
    !!p.phone,
    !!(p.state || p.city),
    !!p.registrationNumber,
    !!p.specialty,
    !!p.grade,
    !!p.licenseStatus,
    !!p.summary,
    list(p.qualifications).length > 0,
    list(p.experience).length > 0,
    list(p.clinicalSkills).length > 0,
    list(p.procedures).length > 0,
    list(p.certifications).length > 0,
    list(p.publicationDetails).length > 0 || list(p.publications).length > 0,
    list(p.documentChecklist).length > 0,
    list(p.languages).length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function initialsFor(name: string): string {
  const parts = name
    .replace(/^Dr\.?\s+/i, '')
    .trim()
    .split(/\s+/);
  const first = parts[0]?.[0] ?? 'A';
  const last = parts[parts.length - 1]?.[0] ?? 'H';
  return (first + last).toUpperCase();
}

function deriveHeadline(p: ProfileJson): string {
  if (p.headline) return String(p.headline);
  const years = Number(p.yearsExperience);
  const exp = years ? `${years} years experience` : '';
  const firstExp = list(p.experience)[0] as { specialty?: string; role?: string } | undefined;
  const clinicalTitle = [p.grade, p.specialty || firstExp?.specialty || p.role].filter(Boolean).join(' ');
  const role = clinicalTitle || firstExp?.role || p.role;
  return [role, exp].filter(Boolean).join(' · ');
}

/** Website `formatPublicationDetail`. */
function formatPublication(p: Publication): string {
  const venue = [p.journal, p.year].filter(Boolean).join(' ');
  const doi = p.doi ? ` DOI/PMID: ${p.doi}` : '';
  return [p.authors, p.title, venue].filter(Boolean).join('. ') + doi;
}

/**
 * Form → profile JSON (website `toProfile`). `base` is the profile as the server sent it: every key the form does not
 * own (picture, CV fields, anything the website added later) is sent back unchanged. Headline, initials and completeness are
 * recomputed from the form, as the website does.
 */
export function profileFromDraft(s: Draft, base: ProfileJson): ProfileJson {
  const publicationDetails = s.publicationDetails.filter((p) =>
    Boolean(p.title.trim() || p.journal.trim() || p.authors.trim() || p.year.trim() || p.doi.trim()),
  );
  const publications = Array.from(
    new Set([
      ...s.publications.map((p) => p.trim()).filter(Boolean),
      ...publicationDetails.map(formatPublication),
    ]),
  );
  const out: ProfileJson = {
    ...base,
    name: s.fullName.trim() || 'Healthcare Professional',
    email: s.email.trim(),
    phone: s.phone.trim(),
    linkedinUrl: s.linkedinUrl.trim(),
    city: s.city.trim() || s.state,
    state: s.state,
    role: s.role,
    specialty: s.specialty.trim(),
    grade: s.grade.trim(),
    preferredRoleTypes: s.preferredRoleTypes,
    registrationNumber: s.registrationNumber.trim(),
    registrationCouncil: s.registrationCouncil.trim(),
    licenseStatus: s.licenseStatus,
    specialistRegisterStatus: s.specialistRegisterStatus,
    revalidationDate: s.revalidationDate,
    indemnityProvider: s.indemnityProvider.trim(),
    rightToWork: s.rightToWork,
    visaStatus: s.visaStatus.trim(),
    yearsExperience: s.yearsExperience,
    qualifications: s.qualifications.filter((q) =>
      Boolean(q.degree.trim() || q.institution.trim() || q.year.trim()),
    ),
    experience: s.experience
      .filter((e) => Boolean(e.role.trim() || e.hospital.trim()))
      .map((e) => ({
        ...e,
        role: e.role.trim(),
        hospital: e.hospital.trim(),
        city: e.city.trim(),
        end: e.current ? '' : e.end,
        summary: e.summary.trim(),
        specialty: e.specialty.trim(),
        hospitalType: e.hospitalType.trim(),
        department: e.department.trim(),
        patientLoad: e.patientLoad.trim(),
        rota: e.rota.trim(),
      })),
    clinicalSkills: s.clinicalSkills,
    technicalSkills: s.technicalSkills,
    procedures: s.procedures.filter((p) => Boolean(p.name.trim())),
    certifications: s.certifications.filter((c) =>
      Boolean(c.name.trim() || c.issuer.trim() || c.year.trim()),
    ),
    publications,
    publicationDetails,
    totalCitations: s.totalCitations.trim(),
    hIndex: s.hIndex.trim(),
    i10Index: s.i10Index.trim(),
    scholarUrl: s.scholarUrl.trim(),
    orcid: s.orcid.trim(),
    professionalHighlights: s.professionalHighlights.filter((h) =>
      Boolean(h.title.trim() || h.detail.trim()),
    ),
    languages: s.languages,
    availability: s.availability,
    expectedSalaryMin: s.expectedSalaryMin,
    expectedSalaryMax: s.expectedSalaryMax,
    currentSalaryMin: s.currentSalaryMin,
    currentSalaryMax: s.currentSalaryMax,
    preferredLocations: s.preferredLocations,
    availabilityStatus: s.availabilityStatus,
    summary: s.summary.trim(),
    documentChecklist: s.documentChecklist,
    verified: !!s.registrationNumber && s.licenseStatus === 'Active',
  };
  out.avatar = initialsFor(String(out.name));
  out.headline = deriveHeadline({ ...out, headline: '' });
  out.completeness = computeCompleteness(out);
  return out;
}
