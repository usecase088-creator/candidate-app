// Job lists and saved jobs (docs/reference/API.md §10-16). Loose objects; required = what the screens cannot work without.
// Everything else is optional with a default, so a thin row from the backend never crashes a list.
// Also used by the contract tests and `npm run drift-check` to catch backend shape changes early.
import { z } from 'zod';

const stringList = z.array(z.string()).default([]);

/** One item of GET /api/jobs (formatJob, ../job/backend/src/lib/helpers.ts). Salaries are LPA. */
export const JobSchema = z
  .object({
    id: z.string(),
    role: z.string(),
    specialty: z.string(),
    location: z.string(),
    type: z.string(),
    salaryMin: z.number(),
    salaryMax: z.number(),
    hospitalId: z.string(),
    /** Hospital name (formatJob flattens it to a string). */
    hospital: z.string(),
    postedOn: z.string().nullish(),
    /** The recruiter's role type, e.g. "Nursing Professionals & Paramedics". */
    category: z.string().nullish(),
    city: z.string().nullish(),
    experienceMin: z.number().nullish(),
    experienceMax: z.number().nullish(),
    /** Free text, used when the numbers are 0 / missing. */
    experience: z.string().nullish(),
    status: z.string().nullish(),
    postedDays: z.number().default(0),
    /** May be HTML. */
    description: z.string().nullish(),
    responsibilities: stringList,
    requirements: stringList,
    perks: stringList,
    tags: stringList,
    hospitalLogoUrl: z.string().nullish(),
    hospitalVerified: z.boolean().nullish(),
    hospitalAbout: z.string().nullish(),
    applicants: z.number().nullish(),
    /** 52-98, only when a valid candidate token was sent. */
    matchPercent: z.number().nullish(),
  })
  .loose();

export type Job = z.infer<typeof JobSchema>;

/** GET /api/jobs: a bare array, no paging. */
export const JobListSchema = z.array(JobSchema);

/** One saved job. GET /api/saved-jobs returns a list of these, POST /api/saved-jobs one. */
export const SavedJobSchema = z.object({ savedAt: z.string(), job: JobSchema }).loose();
export type SavedJob = z.infer<typeof SavedJobSchema>;

export const SavedJobListSchema = z.array(SavedJobSchema);

/** DELETE /api/saved-jobs/:jobId */
export const SuccessSchema = z.object({ success: z.boolean() }).loose();

export const GovJobSchema = z
  .object({
    id: z.string(),
    examAuthority: z.string(),
    name: z.string(),
    lastDate: z.string().nullish(),
    link: z.string(),
  })
  .loose();

export type GovJob = z.infer<typeof GovJobSchema>;

/** GET /api/gov-jobs */
export const GovJobListSchema = z.array(GovJobSchema);

export const IntlJobSchema = z
  .object({
    id: z.string(),
    jobPosition: z.string(),
    specialty: z.string(),
    city: z.string(),
    country: z.string(),
    countryFlag: z.string(),
    payscale: z.string(),
    visaSponsorship: z.string(),
    applyLink: z.string(),
    lastDate: z.string().nullish(),
    experience: z.string().nullish(),
    qualification: z.string().nullish(),
    license: z.string().nullish(),
  })
  .loose();

export type IntlJob = z.infer<typeof IntlJobSchema>;

/** GET /api/intl-jobs */
export const IntlJobListSchema = z.array(IntlJobSchema);
