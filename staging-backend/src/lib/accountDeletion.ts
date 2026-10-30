/**
 * A candidate deletes their own account (mobile app; Google Play and the App Store require it).
 *
 * What stays and what goes, decided column by column (a test fails if a new column is added without a decision):
 *  - User row:            deleted. Takes the sign-in email, mobile, name and password hash with it, and (by the database's
 *                         own ON DELETE CASCADE) notifications, search log, push tokens and refresh tokens.
 *  - Candidate row:       kept but emptied ("Deleted candidate"), because applications must keep pointing at a candidate.
 *                         Hidden from search and admin lists by deletedAt, like an admin deletion.
 *  - Applications:        kept for the hospitals' records (status, dates, job, the hospital's own notes and offer letter),
 *                         but the candidate's CV, answers and typed notes are removed.
 *  - Recruiters' notifications about the candidate ("<name> applied for ..."): the name becomes "Deleted candidate"
 *                         (skipped for a job where another applicant has exactly the same name: the message cannot tell).
 *  - Unfinished password-reset and sign-up requests of the candidate's mobile numbers: deleted.
 *  - Files on Cloudinary: queued inside the same database transaction (CloudinaryCleanup), removed right after, and
 *                         retried by a cron sweep if Cloudinary is down. A crash can never leave a file nobody remembers.
 */
import { Prisma } from '@prisma/client';
import logger from './logger';
import prisma from './prisma';
import { deleteCloudinaryAsset } from './cloudinary';

/** Candidate columns that are emptied. */
export const ANONYMISED_CANDIDATE_FIELDS = [
  'name', 'initials', 'role', 'specialty', 'experienceYears', 'location', 'currentEmployer', 'summary', 'matchPercent',
  'verified', 'registration', 'email', 'phone', 'languages', 'procedures', 'skills', 'education', 'certifications',
  'experience', 'profileJson', 'cvSource', 'uploadedCvName', 'uploadedCvMime', 'cvCloudinaryId', 'cvUrl', 'avatarUrl',
  'avatarCloudinaryId', 'supportingDocuments', 'expectedSalaryMin', 'expectedSalaryMax', 'currentSalaryMin',
  'currentSalaryMax', 'noticePeriod', 'preferredLocations', 'availabilityStatus', 'searchBlob', 'userId', 'deletedAt',
] as const;
/** Candidate columns that stay as they are: ids and bookkeeping that say nothing about the person. */
export const KEPT_CANDIDATE_FIELDS = ['id', 'isSuspended', 'createdAt', 'updatedAt'] as const;

/** Application columns that are emptied: what the candidate sent or wrote. */
export const ANONYMISED_APPLICATION_FIELDS = [
  'cvSource', 'uploadedCvName', 'uploadedCvMime', 'uploadedCvData', 'customFieldResponses', 'cvCloudinaryId', 'cvUrl',
  'supportingDocuments', 'candidateResponseNote',
] as const;
/**
 * Application columns that stay: the hospital's own records (status, interview, offer, joining, notes about the process).
 * interviewHistory is the hospital's log of its own interview steps.
 */
export const KEPT_APPLICATION_FIELDS = [
  'id', 'status', 'appliedOn', 'interviewDate', 'interviewType', 'meetingLink', 'venue', 'interviewerName',
  'interviewerEmail', 'interviewNotes', 'interviewRound', 'interviewHistory', 'interviewOutcomeNote',
  'requestedDocumentList', 'documentRequestNote', 'offerLetterUrl', 'offerLetterCloudinaryId', 'joiningDate',
  'joiningNote', 'finalStatusNote', 'isFlagged', 'reviewedAt', 'interviewScheduledAt', 'offerSentAt', 'joinedAt',
  'updatedAt', 'jobId', 'candidateId',
] as const;

type CleanupItem = { publicId: string; resourceType: 'raw' | 'image' };
const MAX_ATTEMPTS = 20;

function documentIds(raw: unknown): string[] {
  // Candidate.supportingDocuments is JSON; Application.supportingDocuments is the same list as text.
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((d) => (d && typeof d === 'object' ? (d as { publicId?: unknown }).publicId : undefined))
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}

/** Every Cloudinary file that belongs to the candidate, once each. */
function filesOf(candidate: {
  cvCloudinaryId: string | null;
  avatarCloudinaryId: string | null;
  supportingDocuments: unknown;
  applications: {
    cvCloudinaryId: string | null;
    supportingDocuments?: unknown;
    applicationDocuments: { cloudinaryId: string; uploadedBy: string }[];
  }[];
}): CleanupItem[] {
  const items = new Map<string, CleanupItem>();
  const add = (publicId: string | null | undefined, resourceType: 'raw' | 'image' = 'raw') => {
    if (publicId) items.set(publicId, { publicId, resourceType });
  };
  add(candidate.cvCloudinaryId);
  add(candidate.avatarCloudinaryId, 'image');
  documentIds(candidate.supportingDocuments).forEach((id) => add(id));
  for (const app of candidate.applications) {
    add(app.cvCloudinaryId);
    documentIds(app.supportingDocuments).forEach((id) => add(id));
    // Only what the candidate uploaded. A document the hospital added to the application is the hospital's.
    app.applicationDocuments.filter((d) => d.uploadedBy === 'CANDIDATE').forEach((d) => add(d.cloudinaryId));
  }
  return [...items.values()];
}

const NULL_JSON = Prisma.DbNull;
export const DELETED_NAME = 'Deleted candidate';

/** Every way a mobile number is stored (sign-up, profile and reset flows write it differently; see authRoutes). */
export function mobileVariants(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const n = raw.replace(/\s+/g, '').replace(/^\+91/, '');
  if (!/^\d{6,15}$/.test(n)) return [raw];
  return [...new Set([raw, n, `+91${n}`, `+91 ${n}`, `${n.slice(0, 5)} ${n.slice(5)}`, `+91 ${n.slice(0, 5)} ${n.slice(5)}`])];
}

/**
 * Recruiter notifications about this candidate's applications (applicationRoutes notifyRecruiter) start with the name the
 * candidate had then, followed by "applied for" or "has ...". The name is replaced; nothing else in the message changes.
 */
type NotificationTx = {
  application: { count: (args: { where: Prisma.ApplicationWhereInput }) => Promise<number> };
  inAppNotification: {
    findMany: (args: {
      where: Prisma.InAppNotificationWhereInput;
      select: { id: true; message: true; link: true };
    }) => Promise<{ id: string; message: string; link: string | null }[]>;
    update: (args: { where: { id: string }; data: { message: string } }) => Promise<unknown>;
  };
};

async function renameInRecruiterNotifications(
  tx: NotificationTx,
  candidate: { id: string; applications: { jobId: string }[] },
  names: string[],
): Promise<void> {
  const known = [...new Set(names.map((x) => x.trim()).filter((x) => x.length > 0))];
  const jobIds = [...new Set(candidate.applications.map((a) => a.jobId))];
  if (known.length === 0 || jobIds.length === 0) return;
  const safeJobs: string[] = [];
  for (const jobId of jobIds) {
    const sameName = await tx.application.count({
      where: { jobId, candidateId: { not: candidate.id }, candidate: { name: { in: known } } },
    });
    if (sameName === 0) safeJobs.push(jobId);
  }
  if (safeJobs.length === 0) return;
  const links = new Set(safeJobs.map((j) => `/applicants?jobId=${j}`));
  const rows = await tx.inAppNotification.findMany({
    where: { link: { in: [...links] } },
    select: { id: true, message: true, link: true },
  });
  // Longest name first, so "Dr. Asha Rao" is not read as a shorter name followed by something else.
  const byLength = [...known].sort((a, b) => b.length - a.length);
  for (const row of rows) {
    if (!row.link || !links.has(row.link)) continue;
    const name = byLength.find((x) => row.message.startsWith(`${x} applied for `) || row.message.startsWith(`${x} has `));
    if (!name) continue;
    await tx.inAppNotification.update({
      where: { id: row.id },
      data: { message: DELETED_NAME + row.message.slice(name.length) },
    });
  }
}

/** Deletes the account of the user in one transaction. Throws if anything fails; nothing is half done. */
export async function deleteCandidateAccount(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const candidate = await tx.candidate.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        phone: true,
        profileJson: true,
        cvCloudinaryId: true,
        avatarCloudinaryId: true,
        supportingDocuments: true,
        applications: {
          select: {
            id: true,
            jobId: true,
            cvCloudinaryId: true,
            supportingDocuments: true,
            applicationDocuments: { select: { cloudinaryId: true, uploadedBy: true } },
          },
        },
      },
    });

    const user = await tx.user.findUnique({ where: { id: userId }, select: { mobile: true, name: true, fullName: true } });

    if (candidate) {
      const profileName = (candidate.profileJson as { name?: unknown } | null)?.name;
      await renameInRecruiterNotifications(tx, candidate, [
        candidate.name ?? '',
        user?.name ?? '',
        user?.fullName ?? '',
        typeof profileName === 'string' ? profileName : '',
      ]);
      const files = filesOf(candidate);
      if (files.length > 0) await tx.cloudinaryCleanup.createMany({ data: files });

      await tx.savedJob.deleteMany({ where: { candidateId: candidate.id } });
      await tx.applicationDocument.deleteMany({
        where: { uploadedBy: 'CANDIDATE', application: { candidateId: candidate.id } },
      });
      await tx.application.updateMany({
        where: { candidateId: candidate.id },
        data: {
          cvSource: null,
          uploadedCvName: null,
          uploadedCvMime: null,
          uploadedCvData: null,
          customFieldResponses: null,
          cvCloudinaryId: null,
          cvUrl: null,
          supportingDocuments: null,
          candidateResponseNote: null,
        },
      });
      await tx.candidate.update({
        where: { id: candidate.id },
        data: {
          name: 'Deleted candidate',
          initials: null,
          role: null,
          specialty: null,
          experienceYears: null,
          location: null,
          currentEmployer: null,
          summary: null,
          matchPercent: null,
          verified: false,
          registration: null,
          // Must stay unique and must not look like a real address.
          email: `deleted-${candidate.id}@deleted.invalid`,
          phone: null,
          languages: null,
          procedures: null,
          skills: NULL_JSON,
          education: NULL_JSON,
          certifications: NULL_JSON,
          experience: NULL_JSON,
          profileJson: NULL_JSON,
          cvSource: null,
          uploadedCvName: null,
          uploadedCvMime: null,
          cvCloudinaryId: null,
          cvUrl: null,
          avatarUrl: null,
          avatarCloudinaryId: null,
          supportingDocuments: NULL_JSON,
          expectedSalaryMin: null,
          expectedSalaryMax: null,
          currentSalaryMin: null,
          currentSalaryMax: null,
          noticePeriod: null,
          preferredLocations: NULL_JSON,
          availabilityStatus: null,
          searchBlob: null,
          // Unlink first: the user row can only be deleted when no candidate points at it.
          userId: null,
          deletedAt: new Date(),
        },
      });
      await tx.activityLog.create({
        data: {
          entityType: 'candidate',
          entityId: candidate.id,
          action: 'deleted',
          actorId: userId,
          actorRole: 'CANDIDATE',
          meta: JSON.stringify({ type: 'self_delete' }),
        },
      });
    }
    // Unfinished reset / sign-up requests hold the mobile number and are never swept: remove them with the account.
    const mobiles = [...new Set([...mobileVariants(user?.mobile), ...mobileVariants(candidate?.phone)])];
    if (mobiles.length > 0) {
      await tx.resetToken.deleteMany({ where: { mobile: { in: mobiles }, role: 'CANDIDATE' } });
      await tx.otpVerificationToken.deleteMany({ where: { mobile: { in: mobiles }, role: 'CANDIDATE' } });
    }
    await tx.user.delete({ where: { id: userId } });
  });
}

const kindsToTry = (type: string) => (type === 'image' ? ['image'] : ['raw']);

/** Removes queued files from Cloudinary; failures stay queued (20 tries, then they are logged for a person to clean). */
export async function processCleanup(): Promise<void> {
  try {
    const rows = await prisma.cloudinaryCleanup.findMany({ orderBy: { createdAt: 'asc' }, take: 200 });
    const finished: string[] = [];
    for (const row of rows) {
      try {
        for (const kind of kindsToTry(row.resourceType)) {
          await deleteCloudinaryAsset(row.publicId, kind);
        }
        finished.push(row.id);
      } catch (error) {
        const attempts = row.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          logger.error(
            `[delete-account] giving up on Cloudinary file ${row.publicId} (${row.resourceType}) after ${attempts} tries: ${error instanceof Error ? error.message : String(error)}. Delete it by hand.`,
          );
          finished.push(row.id);
        } else {
          await prisma.cloudinaryCleanup.update({ where: { id: row.id }, data: { attempts, lastTriedAt: new Date() } });
        }
      }
    }
    if (finished.length > 0) await prisma.cloudinaryCleanup.deleteMany({ where: { id: { in: finished } } });
  } catch (error) {
    logger.warn('Cloudinary clean-up failed (ignored): %s', error instanceof Error ? error.message : String(error));
  }
}
