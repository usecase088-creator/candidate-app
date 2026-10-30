// Port of the website's validateWizardStep (candidates/src/lib/validations.ts): same rules, same words, same order.
import { parseWebsiteDate } from '@/lib/dates';
import { z } from 'zod';

import { isDentist, isDoctor, isNurse } from './options';
import type { Draft } from './model';

const emailSchema = z.string().email('Enter a valid email');
const phoneSchema = z
  .string()
  .min(10, 'Enter a valid 10-digit phone number')
  .max(15, 'Phone number is too long')
  .regex(/^[\d\s+\-()]+$/, 'Phone number can only contain digits and + - ( )');

export function validateLinkedInUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return parsed.hostname.toLowerCase().includes('.com') ? null : 'Enter a valid public profile URL';
  } catch {
    return 'Enter a valid public profile URL';
  }
}

/** A date the website accepts (YYYY-MM-DD, YYYY-MM, YYYY: date-fns parseISO), as local midnight in ms, or null. */
function parseIsoDate(value: string): number | null {
  return parseWebsiteDate(value)?.getTime() ?? null;
}

function todayUtc() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
}

function compareDates(start: string, end: string, endIsCurrent: boolean): string | null {
  const startD = parseIsoDate(start);
  if (!start) return 'Start date is required';
  if (startD === null) return 'Enter a valid start date';
  const today = todayUtc();
  if (startD > today) return 'Start date cannot be in the future';
  if (endIsCurrent || !end.trim()) return null;
  const endD = parseIsoDate(end);
  if (endD === null) return 'Enter a valid end date, or mark as current role';
  if (endD < startD) return 'End date cannot be before start date';
  if (endD > today) return 'End date cannot be in the future';
  return null;
}

const isYear = (value: string, max: number) => {
  const y = Number(value);
  return /^\d{4}$/.test(value) && !Number.isNaN(y) && y >= 1950 && y <= max;
};

/** The first problem on a step, or null. Steps are numbered 0-15 as on the website. */
export function validateStep(step: number, s: Draft): string | null {
  const thisYear = new Date().getFullYear();
  switch (step) {
    case 0: {
      if (!s.fullName.trim()) return 'Full name is required';
      const email = emailSchema.safeParse(s.email.trim());
      if (!email.success) return email.error.issues[0]?.message ?? 'Invalid email';
      const phone = phoneSchema.safeParse(s.phone.trim());
      if (!phone.success) return phone.error.issues[0]?.message ?? 'Invalid phone';
      if (!s.state.trim()) return 'Please select your state';
      return validateLinkedInUrl(s.linkedinUrl);
    }
    case 1: {
      if (!s.role) return 'Role is required';
      if (Number.isNaN(s.yearsExperience) || s.yearsExperience < 0)
        return 'Years of experience must be 0 or more';
      if (s.yearsExperience > 60) return 'Years of experience seems too high — check the value';
      if ((isDoctor(s.role) || isDentist(s.role)) && !s.specialty.trim())
        return 'Primary specialty is required';
      return null;
    }
    case 2: {
      if (isDoctor(s.role) || isDentist(s.role)) {
        if (!s.registrationCouncil.trim()) return 'Registration council is required';
        if (!s.registrationNumber.trim()) return 'Registration number is required';
      }
      if (isNurse(s.role) && !s.registrationNumber.trim()) return 'INC registration number is required';
      if ((isDoctor(s.role) || isDentist(s.role)) && !s.licenseStatus.trim())
        return 'License status is required';
      return null;
    }
    case 3: {
      if (s.qualifications.length === 0) return 'Add at least one qualification';
      for (const [i, q] of s.qualifications.entries()) {
        if (!q.degree.trim()) return `Qualification ${i + 1}: degree is required`;
        if (!q.institution.trim()) return `Qualification ${i + 1}: institution is required`;
        const year = q.year.trim();
        if (!year) return `Qualification ${i + 1}: year is required`;
        if (!isYear(year, thisYear)) return `Qualification ${i + 1}: enter a valid 4-digit year`;
      }
      return null;
    }
    case 4: {
      if (s.experience.length === 0) return 'Add at least one work experience';
      for (const [i, ex] of s.experience.entries()) {
        if (!ex.role.trim()) return `Experience ${i + 1}: role is required`;
        if (!ex.hospital.trim()) return `Experience ${i + 1}: hospital is required`;
        if (!ex.city.trim()) return `Experience ${i + 1}: city is required`;
        const dateErr = compareDates(ex.start, ex.end, Boolean(ex.current));
        if (dateErr) return `Experience ${i + 1}: ${dateErr}`;
        if (isDoctor(s.role) && !ex.specialty.trim()) {
          return `Experience ${i + 1}: specialty or department focus is required`;
        }
      }
      return null;
    }
    case 5:
      return s.clinicalSkills.length === 0 ? 'Add at least one clinical skill' : null;
    case 6: {
      for (const [i, p] of s.procedures.entries()) {
        if (p.name.trim() && (Number.isNaN(p.count) || p.count < 0))
          return `Procedure ${i + 1}: count must be 0 or more`;
        if (!p.name.trim() && p.count > 0) return `Procedure ${i + 1}: enter a procedure name`;
      }
      return null;
    }
    case 7: {
      for (const [i, p] of s.publicationDetails.entries()) {
        const hasAny = Boolean(
          p.title.trim() || p.authors.trim() || p.journal.trim() || p.year.trim() || p.doi.trim(),
        );
        if (!hasAny && !p.citations) continue;
        if (!p.title.trim()) return `Publication ${i + 1}: title is required`;
        if (!p.journal.trim()) return `Publication ${i + 1}: journal or venue is required`;
        if (p.year.trim() && !isYear(p.year.trim(), thisYear + 1)) {
          return `Publication ${i + 1}: enter a valid publication year`;
        }
        if (Number.isNaN(p.citations) || p.citations < 0)
          return `Publication ${i + 1}: citations must be 0 or more`;
      }
      for (const [label, value] of [
        ['Total citations', s.totalCitations],
        ['h-index', s.hIndex],
        ['i10-index', s.i10Index],
      ] as const) {
        if (value.trim() && (!/^\d+$/.test(value.trim()) || Number(value) < 0)) {
          return `${label} must be a whole number`;
        }
      }
      return null;
    }
    case 8: {
      for (const [i, h] of s.professionalHighlights.entries()) {
        if (!(h.title.trim() || h.detail.trim() || h.year.trim())) continue;
        if (!h.title.trim()) return `Highlight ${i + 1}: title is required`;
        if (!h.category.trim()) return `Highlight ${i + 1}: category is required`;
      }
      return null;
    }
    case 11: {
      if (s.expectedSalaryMin < 0 || s.expectedSalaryMax < 0) return 'Expected salary cannot be negative';
      if (s.expectedSalaryMin > s.expectedSalaryMax) return 'Minimum expected salary cannot exceed maximum';
      if (s.currentSalaryMin < 0 || s.currentSalaryMax < 0) return 'Current salary cannot be negative';
      if (s.currentSalaryMin > s.currentSalaryMax) return 'Minimum current salary cannot exceed maximum';
      return null;
    }
    case 13: {
      if (!s.summary.trim()) return 'Professional summary is required';
      if (s.summary.trim().length < 40) return 'Professional summary should be at least 40 characters';
      return null;
    }
    default:
      return null;
  }
}
