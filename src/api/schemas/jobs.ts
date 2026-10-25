// Public job lists (docs/reference/API.md §10, 12, 13). Loose objects; only what the job screens (Phase 2) need is
// required. Also used by the contract tests and `npm run drift-check` to catch backend shape changes early.
import { z } from 'zod';

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
  })
  .loose();

export type Job = z.infer<typeof JobSchema>;

/** GET /api/jobs: a bare array, no paging. */
export const JobListSchema = z.array(JobSchema);

export const GovJobSchema = z
  .object({
    id: z.string(),
    examAuthority: z.string(),
    name: z.string(),
    lastDate: z.string().nullish(),
    link: z.string(),
  })
  .loose();

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
  })
  .loose();

/** GET /api/intl-jobs */
export const IntlJobListSchema = z.array(IntlJobSchema);
