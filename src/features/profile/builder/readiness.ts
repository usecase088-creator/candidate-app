// "Application readiness" of the profile form (website ProfileFormWizard `computeDoctorReadiness`): ten checks on what
// is typed so far, as a rounded percent, and the first three that fail as "Next best fixes". Not the Profile tab's
// completeness (model.ts computeCompleteness), which the website computes on the saved profile with 17 checks.
import type { Draft } from './model';

export type Readiness = { score: number; missing: string[] };

const MAX_FIXES = 3;
/** Website: a summary counts from 40 characters. */
const MIN_SUMMARY = 40;

export function builderReadiness(s: Draft): Readiness {
  const checks: [boolean, string][] = [
    [Boolean(s.fullName && s.email && s.phone), 'Add contact details'],
    [Boolean(s.specialty), 'Select specialty'],
    [
      Boolean(s.registrationNumber && s.registrationCouncil && s.licenseStatus),
      'Add active registration details',
    ],
    [s.qualifications.length > 0, 'Add at least one qualification'],
    [s.experience.length > 0, 'Add structured clinical experience'],
    [s.clinicalSkills.length > 0, 'Add clinical skills'],
    [s.procedures.length > 0, 'Add procedure exposure'],
    [
      s.publicationDetails.length > 0 || s.publications.length > 0 || Boolean(s.totalCitations),
      'Add publications or citation metrics',
    ],
    [s.documentChecklist.length > 0, 'Mark verification documents ready'],
    [s.summary.trim().length >= MIN_SUMMARY, 'Write a professional summary'],
  ];
  const done = checks.filter(([ok]) => ok).length;
  return {
    score: Math.round((done / checks.length) * 100),
    missing: checks
      .filter(([ok]) => !ok)
      .slice(0, MAX_FIXES)
      .map(([, label]) => label),
  };
}
