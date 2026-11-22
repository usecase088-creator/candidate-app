// What the Profile tab shows of the saved profile (website routes/profile.tsx ProfileFull): the hero extras, the stats
// strip and the content sections. Read from the loose profile JSON through draftFromMe, so a malformed value never
// reaches the screen. Hide rules are the website's: a section with no data is not drawn.
import type { CandidateMe, SupportingDocument } from '@/api/schemas/candidate';
import { formatLPA } from '@/features/jobs/logic/format';

import { draftFromMe, type Draft, type ProfileJson } from '../builder/model';

export type ProfileStat = { key: string; label: string; value: string };

export type ProfileView = {
  draft: Draft;
  location: string;
  phone: string;
  /** "Verified {role}" when the profile is verified, else null. */
  verified: string | null;
  stats: ProfileStat[];
  /** Raw availability (draftFromMe fills a default the website would not show). */
  availability: string;
  expectedCtc: string | null;
  currentCtc: string | null;
  documents: SupportingDocument[];
};

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Website stats strip: the range, or a dash when neither end is set. */
function ctc(min: number, max: number): string | null {
  return (min || max) > 0 ? formatLPA(min, max) : null;
}

export function profileView(me: CandidateMe): ProfileView {
  const p = (me.profile ?? {}) as ProfileJson;
  const draft = draftFromMe(me);
  const expectedCtc = ctc(draft.expectedSalaryMin, draft.expectedSalaryMax);
  const currentCtc = ctc(draft.currentSalaryMin, draft.currentSalaryMax);
  const procedures = draft.procedures.reduce((sum, row) => sum + row.count, 0);
  const role = text(p.role) || text(me.role);
  return {
    draft,
    location: [text(p.city), text(p.state)].filter(Boolean).join(', '),
    phone: text(p.phone) || text(me.phone),
    verified: p.verified === true ? `Verified ${role}`.trim() : null,
    stats: [
      { key: 'experience', label: 'Experience', value: `${draft.yearsExperience} yrs` },
      { key: 'procedures', label: 'Procedures', value: procedures.toLocaleString('en-IN') },
      { key: 'certifications', label: 'Certifications', value: String(draft.certifications.length) },
      { key: 'expectedCtc', label: 'Expected CTC', value: expectedCtc ?? '—' },
      { key: 'currentCtc', label: 'Current CTC', value: currentCtc ?? '—' },
    ],
    availability: text(p.availability),
    expectedCtc,
    currentCtc,
    documents: me.supportingDocuments ?? [],
  };
}

/** Builder step (index) each section's Edit opens (options.ts STEPS). */
export const SECTION_STEP = {
  about: 13,
  experience: 4,
  education: 3,
  procedures: 6,
  certifications: 9,
  publications: 7,
  documents: 14,
  registration: 2,
  availability: 10,
  clinicalSkills: 5,
  technicalSkills: 10,
  languages: 12,
} as const;
export type SectionKey = keyof typeof SECTION_STEP;
