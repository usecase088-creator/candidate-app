// Applications and uploads (docs/reference/API.md §17-22). Loose objects; required = what the screens cannot work without.
// Lists the backend leaves out or sends as null become empty lists. Also used by the contract tests.
import { z } from 'zod';

const list = <T extends z.ZodType>(item: T) =>
  z
    .array(item)
    .nullish()
    .transform((v) => v ?? []);

/** One job-specific question of a job (`customApplicationFields`). Unknown types are kept; the screen shows plain text. */
export const CustomFieldSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    type: z.string(),
    required: z.boolean().default(false),
    placeholder: z.string().nullish(),
    helpText: z.string().nullish(),
    options: z.array(z.string()).nullish(),
  })
  .loose();

export type CustomField = z.infer<typeof CustomFieldSchema>;

/** Answers to the job questions, keyed by field id (what POST /api/applications takes as `customFieldResponses`). */
export type CustomFieldResponses = Record<string, string | number | boolean>;

/** A document the candidate uploaded for an application (POST /api/applications/:id/documents). */
export const ApplicationDocumentSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    applicationId: z.string().nullish(),
    cloudinaryId: z.string().nullish(),
    mime: z.string().nullish(),
    uploadedBy: z.string().nullish(),
    uploadedAt: z.string().nullish(),
  })
  .loose();

export type ApplicationDocument = z.infer<typeof ApplicationDocumentSchema>;

export const ApplicationDocumentListSchema = z.array(ApplicationDocumentSchema);

/** The job inside an application row (raw job + hospital name). */
const ApplicationJobSchema = z
  .object({
    id: z.string(),
    role: z.string(),
    hospital: z.string(),
    hospitalLogoUrl: z.string().nullish(),
    city: z.string().nullish(),
    location: z.string().nullish(),
    category: z.string().nullish(),
    type: z.string().nullish(),
    status: z.string().nullish(),
    customApplicationFields: list(CustomFieldSchema),
  })
  .loose();

/** One item of GET /api/applications (formatApp, ../job/backend/src/lib/helpers.ts). Dates are ISO strings. */
export const ApplicationSchema = z
  .object({
    id: z.string(),
    /** One of the 26 statuses of the website (lib/applicationStatus.ts), or an old one (`New`, `Contacted`). */
    status: z.string(),
    appliedOn: z.string().nullish(),
    jobId: z.string().nullish(),
    job: ApplicationJobSchema,
    matchPercent: z.number().nullish(),
    cvSource: z.string().nullish(),
    cvUrl: z.string().nullish(),
    // interview
    interviewDate: z.string().nullish(),
    interviewType: z.string().nullish(),
    meetingLink: z.string().nullish(),
    venue: z.string().nullish(),
    interviewerName: z.string().nullish(),
    interviewerEmail: z.string().nullish(),
    interviewNotes: z.string().nullish(),
    interviewRound: z.number().nullish(),
    candidateResponseNote: z.string().nullish(),
    // documents
    requestedDocumentList: list(z.string()),
    documentRequestNote: z.string().nullish(),
    supportingDocuments: list(z.unknown()),
    applicationDocuments: list(ApplicationDocumentSchema),
    // offer, joining, end
    offerLetterUrl: z.string().nullish(),
    joiningDate: z.string().nullish(),
    joiningNote: z.string().nullish(),
    finalStatusNote: z.string().nullish(),
    updatedAt: z.string().nullish(),
  })
  .loose();

export type Application = z.infer<typeof ApplicationSchema>;

/** GET /api/applications without `?page`: a bare array, newest first, at most 50. */
export const ApplicationListSchema = z.array(ApplicationSchema);

/** POST /api/upload/cv and each item of POST /api/upload/documents. */
export const UploadedFileSchema = z
  .object({
    url: z.string(),
    publicId: z.string(),
    name: z.string().nullish(),
    mime: z.string().nullish(),
  })
  .loose();

export type UploadedFile = z.infer<typeof UploadedFileSchema>;

export const UploadedFileListSchema = z.array(UploadedFileSchema);
