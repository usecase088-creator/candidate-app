// GET /api/candidates/me: the fields job matching reads (website: lib/hydrate.ts, lib/matchJobs.ts) and the ones the
// website adds to the profile before it sends it back with an application (Phase 3). The profile builder (Phase 4)
// widens this. The profile object is loose on purpose: whatever the server sent must go back unchanged.
import { z } from 'zod';

/** The website's `Profile` (JSON the candidate saved from the form), matching fields only. */
export const MatchProfileSchema = z
  .object({
    role: z.string().nullish(),
    yearsExperience: z.number().nullish(),
    city: z.string().nullish(),
    state: z.string().nullish(),
    preferredLocations: z.array(z.string()).default([]),
    clinicalSkills: z.array(z.string()).default([]),
    technicalSkills: z.array(z.string()).default([]),
    completeness: z.number().default(0),
  })
  .loose();

export type MatchProfile = z.infer<typeof MatchProfileSchema>;

export const CandidateMeSchema = z
  .object({
    id: z.string(),
    name: z.string().nullish(),
    initials: z.string().nullish(),
    email: z.string().nullish(),
    phone: z.string().nullish(),
    role: z.string().nullish(),
    experienceYears: z.number().nullish(),
    location: z.string().nullish(),
    /** "form" | "upload" | null */
    cvSource: z.string().nullish(),
    cvUrl: z.string().nullish(),
    avatarUrl: z.string().nullish(),
    avatarCloudinaryId: z.string().nullish(),
    uploadedCvName: z.string().nullish(),
    uploadedCvData: z.string().nullish(),
    profile: MatchProfileSchema.nullish(),
  })
  .loose();

export type CandidateMe = z.infer<typeof CandidateMeSchema>;
