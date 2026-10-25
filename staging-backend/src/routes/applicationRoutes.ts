import logger from '../lib/logger';
import { formatInterviewDateTime } from '../lib/formatInterviewDate';
import { parseUtcIsoDateTime } from '../lib/parseUtcIsoDateTime';
import { validateUploadMagicBytes, PDF_ONLY_DETECTED_MIMES } from '../lib/validateUploadMagicBytes';
import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest, requireNotPlanSuspended } from '../middleware/auth';
import { formatApp, parseJobCustomFields, validateCustomFieldResponses, syncFormProfile, safeJsonParse } from '../lib/helpers';
import { sendOfferLetterEmail } from '../lib/email';
import multer from 'multer';
import { wrapMulter } from '../lib/multerErrors';
import { uploadRawBuffer } from '../lib/cloudinary';
import { validateCandidateOwnsCv } from '../lib/validateCandidateCvOwnership';

const router = Router();

const ALLOWED_UPLOAD_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function validateMime(mimetype: string) {
  if (!ALLOWED_UPLOAD_MIMES.has(mimetype)) {
    throw new Error('Unsupported file format. Please upload a PDF, DOCX, JPG, or PNG.');
  }
}

// ─── Multer uploads ───────────────────────────────────────────────────────────
const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF, JPEG, PNG, and WebP are allowed.`));
    }
  },
});

const offerLetterUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF is allowed for offer letters.`));
    }
  },
});

// ─── Status definitions ───────────────────────────────────────────────────────

/** All valid application statuses in the system. */
const ALL_STATUSES = [
  'Applied', 'Reviewed',
  'InterviewScheduled', 'InterviewAccepted', 'InterviewDeclined', 'RescheduleRequested',
  'InterviewCompleted', 'NoShow', 'InterviewRescheduled',
  'Shortlisted', 'OnHold', 'NextRound',
  'Rejected',
  'DocumentsRequested', 'DocumentsUploaded',
  'DocumentsApproved', 'AdditionalDocumentsRequired', 'DocumentsRejected',
  'OfferSent', 'OfferAccepted', 'OfferRejected',
  'JoiningConfirmed', 'Joined',
  'Onboarded', 'Dropped',
  'JobClosed',
] as const;

type AppStatus = typeof ALL_STATUSES[number];

const TERMINAL_STATUSES: AppStatus[] = [
  'Onboarded', 'Dropped', 'OfferRejected', 'DocumentsRejected',
  'Rejected', 'InterviewDeclined', 'JobClosed',
];

/** Recruiter-only allowed transitions from each status. */
const RECRUITER_TRANSITIONS: Record<string, AppStatus[]> = {
  'Applied':                   ['Reviewed', 'Rejected'],
  'Reviewed':                  ['InterviewScheduled', 'Rejected'],
  'InterviewScheduled':        ['Rejected', 'InterviewRescheduled'],
  'RescheduleRequested':       ['InterviewScheduled', 'InterviewRescheduled', 'InterviewDeclined', 'Rejected'],
  'InterviewAccepted':         ['InterviewCompleted', 'NoShow', 'Rejected'],
  'InterviewCompleted':        ['Shortlisted', 'Rejected', 'OnHold', 'NextRound'],
  'NoShow':                    ['Rejected', 'InterviewRescheduled'],
  'InterviewRescheduled':      ['InterviewScheduled', 'InterviewCompleted', 'NoShow', 'Rejected'],
  'Shortlisted':               ['OfferSent', 'Rejected'],
  'OnHold':                    ['Shortlisted', 'Rejected'],
  'DocumentsUploaded':         ['DocumentsApproved', 'AdditionalDocumentsRequired', 'DocumentsRejected'],
  'AdditionalDocumentsRequired': ['DocumentsRequested'],
  'DocumentsApproved':         ['JoiningConfirmed'],
  'OfferAccepted':             ['DocumentsRequested', 'JoiningConfirmed', 'Rejected'],
  'JoiningConfirmed':          ['Joined'],
  'Joined':                    ['Onboarded', 'Dropped'],
};

/** Candidate-only allowed transitions from each status. */
const CANDIDATE_TRANSITIONS: Record<string, AppStatus[]> = {
  'InterviewScheduled':          ['InterviewAccepted', 'InterviewDeclined', 'RescheduleRequested'],
  'DocumentsRequested':          ['DocumentsUploaded'],
  'AdditionalDocumentsRequired': ['DocumentsUploaded'],
  'OfferSent':                   ['OfferAccepted', 'OfferRejected'],
};

function getAllowedNextStatuses(current: string, role: 'RECRUITER' | 'CANDIDATE'): AppStatus[] {
  const transitions = role === 'RECRUITER' ? RECRUITER_TRANSITIONS : CANDIDATE_TRANSITIONS;
  return transitions[current] ?? [];
}

// ─── Required fields per target status ───────────────────────────────────────
function validateTransitionPayload(
  targetStatus: AppStatus,
  body: Record<string, unknown>
): { ok: true } | { ok: false; error: string } {
  if (targetStatus === 'InterviewScheduled' || targetStatus === 'NextRound' || targetStatus === 'InterviewRescheduled') {
    if (!body.interviewDate) return { ok: false, error: 'interviewDate is required' };
    if (!body.interviewType) return { ok: false, error: 'interviewType (Virtual/Physical) is required' };
    if (!body.interviewerName) return { ok: false, error: 'interviewerName is required' };
    if (body.interviewType === 'Virtual' && !body.meetingLink)
      return { ok: false, error: 'meetingLink is required for Virtual interviews' };
    if (body.interviewType === 'Physical' && !body.venue)
      return { ok: false, error: 'venue is required for Physical interviews' };
    const parsedInterviewDate = parseUtcIsoDateTime(body.interviewDate, 'interviewDate');
    if (!parsedInterviewDate.ok) return parsedInterviewDate;
    if (parsedInterviewDate.date.getTime() <= Date.now()) {
      return { ok: false, error: 'Interview date/time must be in the future' };
    }
  }
  if (targetStatus === 'RescheduleRequested') {
    if (!body.candidateResponseNote) return { ok: false, error: 'A reason is required to request a reschedule' };
  }
  if (targetStatus === 'DocumentsRequested') {
    if (!body.requestedDocumentList || !Array.isArray(body.requestedDocumentList) || body.requestedDocumentList.length === 0)
      return { ok: false, error: 'requestedDocumentList (array of document names) is required' };
  }
  if (targetStatus === 'OfferSent') {
    if (!body.offerLetterUrl) return { ok: false, error: 'offerLetterUrl is required (upload the PDF first)' };
    if (!body.offerLetterCloudinaryId) return { ok: false, error: 'offerLetterCloudinaryId is required' };
  }
  if (targetStatus === 'JoiningConfirmed') {
    if (!body.joiningDate) return { ok: false, error: 'joiningDate is required' };
    const joiningDate = new Date(String(body.joiningDate));
    if (Number.isNaN(joiningDate.getTime())) return { ok: false, error: 'joiningDate must be valid' };
  }
  return { ok: true };
}

// ─── Build interview history JSON ─────────────────────────────────────────────
function buildInterviewHistory(
  existing: { interviewHistory: string | null; interviewDate: Date | null; interviewType: string | null; meetingLink: string | null; venue: string | null; interviewerName: string | null; interviewerEmail: string | null; interviewNotes: string | null; },
  newSchedule: Record<string, unknown>
): string {
  const prev = safeJsonParse<Record<string, unknown>>(existing.interviewHistory, {});
  const currentSlot = {
    interviewDate: existing.interviewDate,
    interviewType: existing.interviewType,
    meetingLink: existing.meetingLink,
    venue: existing.venue,
    interviewerName: existing.interviewerName,
    interviewerEmail: existing.interviewerEmail,
    interviewNotes: existing.interviewNotes,
  };
  const history = Array.isArray(prev.history) ? prev.history : [];
  if (existing.interviewDate) history.push({ ...currentSlot, changedAt: new Date().toISOString() });
  return JSON.stringify({
    originalSchedule: prev.originalSchedule ?? (existing.interviewDate ? currentSlot : newSchedule),
    updatedSchedule: newSchedule,
    rescheduleCount: (Number(prev.rescheduleCount) || 0) + (existing.interviewDate ? 1 : 0),
    history,
  });
}

// ─── Notification helper ──────────────────────────────────────────────────────
async function createNotification(userId: string, title: string, message: string, link?: string) {
  try {
    await prisma.inAppNotification.create({
      data: { userId, title, message, link: link ?? null },
    });
  } catch (e) {
    logger.warn('[Notification] Failed to create notification: %s', e);
  }
}

async function notifyCandidate(
  candidateUserId: string | null | undefined,
  title: string,
  message: string,
  link?: string
) {
  if (!candidateUserId) return;
  await createNotification(candidateUserId, title, message, link);
}

async function notifyInterviewScheduleChange({
  candidateUserId,
  isReschedule,
  date,
  interviewType,
  jobRole,
  link,
}: {
  candidateUserId: string | null | undefined;
  isReschedule: boolean;
  date: Date | string | null | undefined;
  interviewType: string | null | undefined;
  jobRole: string;
  link?: string;
}) {
  const dateStr = date ? formatInterviewDateTime(date) : '';
  const typeSuffix = interviewType ? ` (${interviewType})` : '';
  const title = isReschedule ? 'Interview Rescheduled' : 'Interview Scheduled';
  const message = isReschedule
    ? `Your interview for ${jobRole} has been rescheduled to ${dateStr}${typeSuffix}.`
    : `Your interview for ${jobRole} has been scheduled on ${dateStr}${typeSuffix}.`;
  await notifyCandidate(candidateUserId, title, message, link ?? '/applications');
}

async function notifyRecruiter(hospitalId: string, title: string, message: string, link?: string) {
  try {
    const recruiters = await prisma.user.findMany({ where: { hospitalId, role: 'RECRUITER' }, select: { id: true } });
    for (const r of recruiters) await createNotification(r.id, title, message, link);
  } catch (e) {
    logger.warn('[Notification] Failed to notify recruiters: %s', e);
  }
}

// ─── GET /api/applications ────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role === 'ADMIN') {
      res.status(403).json({ error: 'Use admin API routes for application data.' });
      return;
    }
    let where: Record<string, unknown> = {};
    if (req.user!.role === 'RECRUITER') {
      const hospitalId = req.user!.hospitalId;
      if (!hospitalId) { res.json([]); return; }

      // If caller requests a specific job, filter directly — avoids over-fetching
      const requestedJobId = typeof req.query.jobId === 'string' ? req.query.jobId : null;
      if (requestedJobId) {
        // Verify the job belongs to this hospital (auth guard)
        const job = await prisma.job.findFirst({
          where: { id: requestedJobId, hospitalId },
          select: { id: true },
        });
        if (!job) {
          res.status(403).json({ error: 'Job not found or access denied' });
          return;
        }
        where = { jobId: requestedJobId };
      } else {
        const jobs = await prisma.job.findMany({ where: { hospitalId }, select: { id: true } });
        where = { jobId: { in: jobs.map(j => j.id) } };
      }
    } else if (req.user!.role === 'CANDIDATE') {
      where = { candidateId: req.user!.candidateId! };
    }

    const isPaginated = req.query.page !== undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    if (isPaginated) {
      const [applications, total] = await Promise.all([
        prisma.application.findMany({
          where,
          include: {
            candidate: true,
            job: { include: { hospital: true } },
            applicationDocuments: { orderBy: { uploadedAt: 'desc' } },
          },
          orderBy: { appliedOn: 'desc' },
          skip,
          take: limit,
        }),
        prisma.application.count({ where })
      ]);
      res.json({
        data: applications.map((app) => formatApp(app, { redactCandidateContact: req.user!.role === 'RECRUITER' })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
      return;
    }

    const applications = await prisma.application.findMany({
      where,
      include: {
        candidate: true,
        job: { include: { hospital: true } },
        applicationDocuments: { orderBy: { uploadedAt: 'desc' } },
      },
      orderBy: { appliedOn: 'desc' },
      take: 50,
    });
    res.json(applications.map((app) => formatApp(app, { redactCandidateContact: req.user!.role === 'RECRUITER' })));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/applications/:id/recruiter-cv ──────────────────────────────────
router.get('/:id/recruiter-cv', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  try {
    const app = await prisma.application.findUnique({
      where: { id: String(req.params.id) },
      include: {
        candidate: true,
        job: { include: { hospital: true } },
      },
    });
    if (!app) { res.status(404).json({ error: 'Application not found' }); return; }
    if (!req.user!.hospitalId || app.job.hospitalId !== req.user!.hospitalId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    const formatted = formatApp(app, { redactCandidateContact: true });
    res.json({
      applicationId: formatted.id,
      candidate: formatted.candidate,
      job: formatted.job,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/applications/:id ────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role === 'ADMIN') {
      res.status(403).json({ error: 'Use admin API routes for application data.' });
      return;
    }
    const app = await prisma.application.findUnique({
      where: { id: String(req.params.id) },
      include: {
        candidate: true,
        job: { include: { hospital: true } },
        applicationDocuments: { orderBy: { uploadedAt: 'desc' } },
      },
    });
    if (!app) { res.status(404).json({ error: 'Application not found' }); return; }
    // Auth check
    if (req.user!.role === 'RECRUITER') {
      if (!req.user!.hospitalId || app.job.hospitalId !== req.user!.hospitalId) {
        res.status(403).json({ error: 'Forbidden' }); return;
      }
    }
    if (req.user!.role === 'CANDIDATE' && app.candidateId !== req.user!.candidateId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    res.json(formatApp(app, { redactCandidateContact: req.user!.role === 'RECRUITER' }));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/applications/pull ─────────────────────────────────────────────
// Recruiter-initiated: automatically apply a candidate (using their existing CV)
// to one of the recruiter's active jobs. Costs 1 premium search quota.
router.post('/pull', requireAuth, requireRole('RECRUITER'), requireNotPlanSuspended, async (req: AuthRequest, res: Response) => {
  const { jobId, candidateId, searchToken } = req.body;

  if (!jobId) { res.status(400).json({ error: 'jobId is required' }); return; }
  if (!candidateId) { res.status(400).json({ error: 'candidateId is required' }); return; }

  try {
    // 1. Verify job belongs to recruiter's hospital and is Active
    const job = await prisma.job.findUnique({
      where: { id: String(jobId) },
      include: { hospital: true },
    });
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
    if (!req.user!.hospitalId || job.hospitalId !== req.user!.hospitalId) {
      res.status(403).json({ error: 'You can only pull candidates to your own hospital\'s jobs' }); return;
    }
    if (job.status !== 'Active') {
      res.status(400).json({ error: 'You can only pull candidates to Active jobs' }); return;
    }

    // 2. Load candidate
    const candidate = await prisma.candidate.findUnique({
      where: { id: String(candidateId) },
    });
    if (!candidate) { res.status(404).json({ error: 'Candidate not found' }); return; }
    if (candidate.isSuspended || candidate.deletedAt) {
      res.status(403).json({ error: 'This candidate profile is not available' }); return;
    }

    // 3. Validate search token or create a new search log on the fly
    let searchLog = null;
    if (searchToken) {
      searchLog = await prisma.searchLog.findFirst({
        where: { id: String(searchToken), userId: req.user!.id },
      });
    }
    if (!searchLog) {
      searchLog = await prisma.searchLog.create({
        data: { userId: req.user!.id, pullUsed: false },
      });
    }
    if (searchLog.pullUsed) {
      res.status(403).json({ error: 'Invalid search token or pull already used for this search.' }); return;
    }

    // 4. Load recruiter for quota check
    const recruiterUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { hospital: true },
    });
    if (!recruiterUser || !recruiterUser.hospital) {
      res.status(400).json({ error: 'No hospital linked to your account' }); return;
    }

    const { getSearchLimit } = await import('../lib/helpers');
    const limit = getSearchLimit(recruiterUser.hospital.onboardingPlan || 'Basic');

    // 5. Run everything in a transaction: mark token used, increment quota, create application
    let application: any;
    try {
      application = await prisma.$transaction(async (tx) => {
        // Mark search log as used
        await tx.searchLog.update({
          where: { id: searchLog.id },
          data: { pullUsed: true },
        });

        // Increment premium search quota (fail if limit already reached)
        const incrementResult = await tx.user.updateMany({
          where: {
            id: req.user!.id,
            premiumSearchesThisMonth: { lt: limit },
          },
          data: { premiumSearchesThisMonth: { increment: 1 } },
        });
        if (incrementResult.count === 0) {
          throw Object.assign(new Error(`You have reached your limit of ${limit} premium searches this month.`), { code: 'PLAN_QUOTA_EXCEEDED' });
        }

        // Create the application using candidate's existing CV data
        return tx.application.create({
          data: {
            jobId: job.id,
            candidateId: candidate.id,
            status: 'Applied',
            cvSource: candidate.cvSource || 'form',
            cvUrl: candidate.cvUrl || null,
            cvCloudinaryId: candidate.cvCloudinaryId || null,
            uploadedCvName: candidate.uploadedCvName || null,
            uploadedCvMime: candidate.uploadedCvMime || null,
            supportingDocuments: candidate.supportingDocuments
              ? JSON.stringify(candidate.supportingDocuments)
              : null,
          },
          include: { candidate: true, job: { include: { hospital: true } } },
        });
      });
    } catch (txErr: any) {
      if (txErr.code === 'PLAN_QUOTA_EXCEEDED') {
        res.status(403).json({ error: txErr.message, code: 'PLAN_QUOTA_EXCEEDED' }); return;
      }
      // Unique constraint: candidate already applied to this job
      if (txErr.code === 'P2002') {
        res.status(409).json({ error: 'This candidate has already been applied to this job.' }); return;
      }
      throw txErr;
    }

    // 6. Notify the candidate (fire-and-forget)
    if (candidate.userId) {
      await notifyCandidate(
        candidate.userId,
        'Profile Shortlisted',
        `A recruiter at ${job.hospital.name} has shortlisted your profile for the ${job.role} position.`,
        '/applications',
      );
    }

    res.status(201).json({
      applicationId: application.id,
      jobId: application.jobId,
      candidateId: application.candidateId,
    });
  } catch (error) {
    logger.error('[pull-to-job]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/applications ────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('CANDIDATE'), async (req: AuthRequest, res: Response) => {
  const { jobId, profile, cvSource, uploadedCv, customFieldResponses, cvUrl, cvCloudinaryId, cvName, cvMime, supportingDocuments } = req.body;
  const candidateId = req.user!.candidateId;
  if (!candidateId) { res.status(400).json({ error: 'No candidate profile linked to your account' }); return; }
  if (!jobId) { res.status(400).json({ error: 'jobId is required' }); return; }
  try {
    const job = await prisma.job.findUnique({
      where: { id: String(jobId) },
      include: { hospital: true },
    });
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
    if (job.hospital.isSuspended) {
      res.status(403).json({ error: 'This position is no longer accepting applications.' });
      return;
    }
    if (job.status === 'Closed') { res.status(400).json({ error: 'This job is no longer accepting applications' }); return; }
    const existing = await prisma.application.findUnique({
      where: { jobId_candidateId: { jobId: String(jobId), candidateId } },
    });
    if (existing) { res.status(409).json({ error: 'You have already applied to this job' }); return; }

    const jobCustomFields = parseJobCustomFields(job.customApplicationFields);
    const responseCheck = validateCustomFieldResponses(jobCustomFields, customFieldResponses);
    if (!responseCheck.ok) { res.status(400).json({ error: responseCheck.error }); return; }
    const customResponsesJson =
      Object.keys(responseCheck.normalized).length > 0 ? JSON.stringify(responseCheck.normalized) : null;

    const source = cvSource === 'upload' ? 'upload' : 'form';
    let appCv: {
      uploadedCvName?: string | null; uploadedCvMime?: string | null; uploadedCvData?: string | null;
      cvUrl?: string | null; cvCloudinaryId?: string | null;
    } = {};

    if (cvUrl || cvCloudinaryId) {
      const cvCheck = validateCandidateOwnsCv(candidateId, cvUrl, cvCloudinaryId);
      if (!cvCheck.ok) {
        res.status(400).json({ error: cvCheck.error });
        return;
      }
      appCv = {
        cvUrl: cvUrl ? String(cvUrl) : null,
        cvCloudinaryId: cvCloudinaryId ? String(cvCloudinaryId) : null,
        uploadedCvName: cvName ? String(cvName) : null,
        uploadedCvMime: cvMime ? String(cvMime) : null,
      };
    } else {
      const attachCvIfPresent = () => {
        if (!uploadedCv?.data || !uploadedCv?.name) return;
        const maxBytes = 5 * 1024 * 1024;
        if (String(uploadedCv.data).length > maxBytes * 1.4) throw new Error('CV file must be under 5MB');
        appCv = {
          uploadedCvName: String(uploadedCv.name),
          uploadedCvMime: String(uploadedCv.mime || 'application/pdf'),
          uploadedCvData: String(uploadedCv.data),
        };
      };
      try { attachCvIfPresent(); } catch (e) {
        res.status(400).json({ error: e instanceof Error ? e.message : 'Invalid CV file' }); return;
      }
    }

    if (source === 'form') {
      if (!profile) { res.status(400).json({ error: 'Profile is required for form applications' }); return; }
      await syncFormProfile(candidateId, profile, req.user!.email, {
        cvUrl: appCv.cvUrl || undefined,
        cvCloudinaryId: appCv.cvCloudinaryId || undefined,
        name: appCv.uploadedCvName || undefined,
        mime: appCv.uploadedCvMime || undefined,
      }, supportingDocuments);
    } else {
      if (!appCv.cvUrl && !appCv.uploadedCvData) {
        res.status(400).json({ error: 'CV file is required for upload applications' }); return;
      }

      const dbCandidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
        select: { profileJson: true },
      });
      if (!dbCandidate || !dbCandidate.profileJson) {
        res.status(400).json({
          error: 'You must fill up the structured form once before you can apply to any job.',
        });
        return;
      }

      const contact = uploadedCv?.contact || {};
      const updatedCandidate = await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          name: String(contact.name || req.user!.name),
          email: String(contact.email || req.user!.email),
          phone: contact.phone ? String(contact.phone) : null,
          cvSource: 'upload',
          ...appCv,
          initials: String(contact.name || req.user!.name).split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
        },
      });
      if (updatedCandidate.phone) {
        await prisma.user.updateMany({
          where: { candidate: { id: candidateId } },
          data: { mobile: updatedCandidate.phone, name: updatedCandidate.name },
        });
      }
    }

    const application = await prisma.application.create({
      data: {
        jobId: String(jobId), candidateId, status: 'Applied',
        cvSource: source, customFieldResponses: customResponsesJson,
        supportingDocuments: supportingDocuments ? JSON.stringify(supportingDocuments) : null,
        ...appCv,
      },
      include: { candidate: true, job: { include: { hospital: true } } },
    });
    await notifyRecruiter(
      job.hospitalId,
      'New Application',
      `${application.candidate.name} applied for ${application.job.role}.`,
      `/applicants?jobId=${application.jobId}`,
    );
    res.status(201).json(formatApp(application));
  } catch (error: any) {
    logger.error(error);
    if (error?.code === 'P2002') { res.status(409).json({ error: 'You have already applied to this job' }); return; }
    const msg = typeof error?.message === 'string' ? error.message : 'Failed to submit application';
    res.status(400).json({ error: msg.slice(0, 200) });
  }
});

// ─── PATCH /api/applications/:id ─────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { status, currentStatus, ...rest } = req.body as { status: string; currentStatus?: string } & Record<string, unknown>;
  if (!status) { res.status(400).json({ error: 'status is required' }); return; }

  const userRole = req.user!.role as 'RECRUITER' | 'CANDIDATE';
  if (!['RECRUITER', 'CANDIDATE'].includes(userRole)) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  try {
    const existing = await prisma.application.findUnique({
      where: { id: String(req.params.id) },
      include: {
        job: { include: { hospital: true } },
        candidate: true,
      },
    });
    if (!existing) { res.status(404).json({ error: 'Application not found' }); return; }

    // Optimistic concurrency for recruiter status updates
    if (userRole === 'RECRUITER') {
      if (currentStatus === undefined || currentStatus === null || String(currentStatus).trim() === '') {
        res.status(400).json({ error: 'currentStatus is required' });
        return;
      }
      if (existing.status !== currentStatus) {
        res.status(409).json({ error: 'Application status has changed. Please refresh and try again.' });
        return;
      }
    }

    // Auth: recruiter must belong to the hospital
    if (userRole === 'RECRUITER') {
      if (!req.user!.hospitalId || existing.job.hospitalId !== req.user!.hospitalId) {
        res.status(403).json({ error: 'Forbidden' }); return;
      }
      const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { planSuspendedAt: true } });
      if (user?.planSuspendedAt) {
        res.status(403).json({ error: 'Your account is suspended due to a plan change. You cannot update applications.', code: 'PLAN_SUSPENDED' });
        return;
      }
    }
    // Auth: candidate must own the application
    if (userRole === 'CANDIDATE' && existing.candidateId !== req.user!.candidateId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    // Terminal check
    if (TERMINAL_STATUSES.includes(existing.status as AppStatus)) {
      res.status(400).json({ error: `Application status "${existing.status}" is final and cannot be changed.` }); return;
    }

    // Transition check
    const allowed = getAllowedNextStatuses(existing.status, userRole);
    if (!allowed.includes(status as AppStatus)) {
      res.status(400).json({
        error: `Cannot move from "${existing.status}" to "${status}" as ${userRole}. Allowed: ${allowed.join(', ') || 'none'}.`,
      }); return;
    }

    // Payload validation
    const payloadCheck = validateTransitionPayload(status as AppStatus, rest);
    if (!payloadCheck.ok) { res.status(400).json({ error: payloadCheck.error }); return; }

    // ── Build the update data ────────────────────────────────────────────────
    const updateData: Record<string, unknown> = { status };

    // Timestamp milestones
    if (status === 'Reviewed') updateData.reviewedAt = new Date();
    if (status === 'InterviewScheduled' || status === 'NextRound' || status === 'InterviewRescheduled') updateData.interviewScheduledAt = new Date();
    if (status === 'OfferSent') updateData.offerSentAt = new Date();
    if (status === 'Joined') updateData.joinedAt = new Date();

    // ── Interview scheduling fields ───────────────────────────────────────────
    if (status === 'InterviewScheduled' || status === 'NextRound' || status === 'InterviewRescheduled') {
      const newSchedule = {
        interviewDate: rest.interviewDate,
        interviewType: rest.interviewType,
        meetingLink: rest.meetingLink ?? null,
        venue: rest.venue ?? null,
        interviewerName: rest.interviewerName,
        interviewerEmail: rest.interviewerEmail ?? null,
        interviewNotes: rest.interviewNotes ?? null,
      };
      const parsedInterview = parseUtcIsoDateTime(rest.interviewDate, 'interviewDate');
      if (parsedInterview.ok) {
        updateData.interviewDate = parsedInterview.date;
      }
      updateData.interviewType = rest.interviewType;
      updateData.meetingLink = rest.meetingLink ?? null;
      updateData.venue = rest.venue ?? null;
      updateData.interviewerName = rest.interviewerName;
      updateData.interviewerEmail = rest.interviewerEmail ?? null;
      updateData.interviewNotes = rest.interviewNotes ?? null;
      updateData.interviewHistory = buildInterviewHistory(existing as any, newSchedule);
    }

    // ── NextRound: auto-increment round counter ───────────────────────────────
    if (status === 'NextRound') {
      updateData.interviewRound = (existing.interviewRound ?? 1) + 1;
      // Immediately move to InterviewScheduled — recruiter will fill details next
      updateData.status = 'InterviewScheduled';
    }

    // ── Candidate response ────────────────────────────────────────────────────
    if (rest.candidateResponseNote !== undefined) updateData.candidateResponseNote = rest.candidateResponseNote;

    // ── Interview outcome note ────────────────────────────────────────────────
    if (rest.interviewOutcomeNote !== undefined) updateData.interviewOutcomeNote = rest.interviewOutcomeNote;

    // ── Document request ──────────────────────────────────────────────────────
    if (status === 'DocumentsRequested') {
      updateData.requestedDocumentList = JSON.stringify(rest.requestedDocumentList);
      if (rest.documentRequestNote !== undefined) updateData.documentRequestNote = rest.documentRequestNote;
    }

    // ── Offer letter ──────────────────────────────────────────────────────────
    if (status === 'OfferSent') {
      updateData.offerLetterUrl = rest.offerLetterUrl;
      updateData.offerLetterCloudinaryId = rest.offerLetterCloudinaryId;
    }

    // ── Joining ───────────────────────────────────────────────────────────────
    if (status === 'JoiningConfirmed') {
      updateData.joiningDate = new Date(rest.joiningDate as string);
      if (rest.joiningNote !== undefined) updateData.joiningNote = rest.joiningNote;
    }

    // ── Final status note ─────────────────────────────────────────────────────
    if (rest.finalStatusNote !== undefined) updateData.finalStatusNote = rest.finalStatusNote;

    const updated = await prisma.application.update({
      where: { id: existing.id },
      data: updateData as any,
      include: {
        candidate: true,
        job: { include: { hospital: true } },
        applicationDocuments: { orderBy: { uploadedAt: 'desc' } },
      },
    });

    // ── Notifications ─────────────────────────────────────────────────────────
    const candidateName = existing.candidate.name;
    const hospitalName = (existing.job.hospital as any)?.name ?? 'The hospital';
    const jobRole = existing.job.role;
    const candidateUserId = existing.candidate.userId;
    const hospitalId = existing.job.hospitalId;
    const finalStatus = updateData.status as string ?? status;

    switch (finalStatus) {
      case 'InterviewScheduled': {
        const isReschedule =
          existing.status === 'RescheduleRequested' || existing.status === 'InterviewScheduled';
        await notifyInterviewScheduleChange({
          candidateUserId,
          isReschedule,
          date: updateData.interviewDate as Date | string | null | undefined,
          interviewType: updateData.interviewType as string | null | undefined,
          jobRole,
          link: '/applications',
        });
        break;
      }
      case 'InterviewRescheduled': {
        await notifyInterviewScheduleChange({
          candidateUserId,
          isReschedule: true,
          date: updateData.interviewDate as Date | string | null | undefined,
          interviewType: updateData.interviewType as string | null | undefined,
          jobRole,
          link: '/applications',
        });
        break;
      }
      case 'RescheduleRequested':
        await notifyRecruiter(hospitalId, 'Reschedule Requested', `${candidateName} has requested to reschedule their interview for ${jobRole}.`, `/applicants?jobId=${existing.jobId}`);
        break;
      case 'InterviewDeclined':
        if (existing.status === 'RescheduleRequested') {
          await notifyCandidate(candidateUserId, 'Reschedule Rejected', `${hospitalName} could not approve your reschedule request for ${jobRole}.`, '/applications');
        } else {
          await notifyRecruiter(hospitalId, 'Interview Declined', `${candidateName} has declined the interview for ${jobRole}.`, `/applicants?jobId=${existing.jobId}`);
        }
        break;
      case 'Rejected':
        await notifyCandidate(candidateUserId, 'Application Closed', `${hospitalName} has closed your application for ${jobRole}.`, '/applications');
        break;
      case 'DocumentsRequested': {
        const n = Array.isArray(rest.requestedDocumentList) ? rest.requestedDocumentList.length : 0;
        await notifyCandidate(candidateUserId, 'Documents Requested', `${hospitalName} has requested ${n} document${n !== 1 ? 's' : ''} for your ${jobRole} application.`, '/applications');
        break;
      }
      case 'DocumentsUploaded':
        await notifyRecruiter(hospitalId, 'Documents Uploaded', `${candidateName} has uploaded the requested documents for ${jobRole}.`, `/applicants?jobId=${existing.jobId}`);
        break;
      case 'AdditionalDocumentsRequired':
        await notifyCandidate(candidateUserId, 'Additional Documents Required', `${hospitalName} requires additional documents for your ${jobRole} application.`, '/applications');
        break;
      case 'OfferSent':
        await notifyCandidate(candidateUserId, 'Offer Letter Received', `You have received an offer letter from ${hospitalName} for ${jobRole}. Please review and respond.`, '/applications');
        // Brevo email — only trigger for offer letter
        try {
          await sendOfferLetterEmail(
            { name: candidateName, email: existing.candidate.email },
            { role: jobRole, hospitalName },
            String(rest.offerLetterUrl),
          );
        } catch (emailErr) {
          logger.warn('[Email] Offer letter email failed: %s', emailErr);
        }
        break;
      case 'OfferAccepted':
        await notifyRecruiter(hospitalId, 'Offer Accepted', `${candidateName} has accepted the offer for ${jobRole}.`, `/applicants?jobId=${existing.jobId}`);
        break;
      case 'OfferRejected':
        await notifyRecruiter(hospitalId, 'Offer Rejected', `${candidateName} has declined the offer for ${jobRole}.`, `/applicants?jobId=${existing.jobId}`);
        break;
      case 'JoiningConfirmed': {
        const joinDateStr = updateData.joiningDate ? new Date(updateData.joiningDate as Date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        await notifyCandidate(candidateUserId, 'Joining Date Confirmed', `Your joining date for ${jobRole} at ${hospitalName} has been confirmed: ${joinDateStr}.`, '/applications');
        break;
      }
      case 'Joined':
        await notifyRecruiter(hospitalId, 'Candidate Joined', `${candidateName} has officially joined for ${jobRole}.`, `/applicants?jobId=${existing.jobId}`);
        break;
    }

    res.json(formatApp(updated, { redactCandidateContact: userRole === 'RECRUITER' }));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/applications/:id/documents ─────────────────────────────────────
router.get('/:id/documents', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role === 'ADMIN') {
      res.status(403).json({ error: 'Use admin API routes for application data.' });
      return;
    }
    const app = await prisma.application.findUnique({
      where: { id: String(req.params.id) },
      include: { job: true, candidate: true },
    });
    if (!app) { res.status(404).json({ error: 'Application not found' }); return; }
    if (req.user!.role === 'RECRUITER' && (!req.user!.hospitalId || app.job.hospitalId !== req.user!.hospitalId)) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    if (req.user!.role === 'CANDIDATE' && app.candidateId !== req.user!.candidateId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    const docs = await prisma.applicationDocument.findMany({
      where: { applicationId: app.id },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json(docs);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/applications/:id/documents ────────────────────────────────────
// Candidate uploads documents in response to a document request
router.post('/:id/documents', requireAuth, requireRole('CANDIDATE'), wrapMulter(documentUpload.array('documents', 15)), async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) { res.status(400).json({ error: 'No documents provided' }); return; }

    const app = await prisma.application.findUnique({
      where: { id: String(req.params.id) },
      include: { job: true, candidate: true },
    });
    if (!app) { res.status(404).json({ error: 'Application not found' }); return; }
    if (app.candidateId !== req.user!.candidateId) { res.status(403).json({ error: 'Forbidden' }); return; }

    // Parse names from body: names[] or name (single), matched by index
    const names: string[] = Array.isArray(req.body.names) ? req.body.names : (req.body.name ? [req.body.name] : []);

    const timestamp = Date.now();
    for (const file of files) {
      validateMime(file.mimetype);
      if (!(await validateUploadMagicBytes(file.buffer))) {
        res.status(400).json({ error: 'Invalid file type.' });
        return;
      }
    }
    const uploadPromises = files.map((file, i) => {
      const publicId = `app_${app.id}_doc_${timestamp}_${i}`;
      return uploadRawBuffer(file.buffer, 'applications/documents', publicId).then(result => ({ file, result, i }));
    });
    
    const uploadResults = await Promise.all(uploadPromises);

    const docData = uploadResults.map(({ file, result, i }) => ({
      applicationId: app.id,
      name: names[i] || file.originalname,
      url: result.secure_url,
      cloudinaryId: result.public_id,
      mime: file.mimetype,
      uploadedBy: 'CANDIDATE',
    }));

    await prisma.applicationDocument.createMany({ data: docData });
    const created = await prisma.applicationDocument.findMany({
      where: { applicationId: app.id, cloudinaryId: { in: docData.map(d => d.cloudinaryId) } }
    });

    // Move status to DocumentsUploaded if currently in DocumentsRequested or AdditionalDocumentsRequired
    if (app.status === 'DocumentsRequested' || app.status === 'AdditionalDocumentsRequired') {
      await prisma.application.update({
        where: { id: app.id },
        data: { status: 'DocumentsUploaded' },
      });
      // Notify recruiter
      const hospitalId = app.job.hospitalId;
      await notifyRecruiter(hospitalId, 'Documents Uploaded', `${app.candidate.name} has uploaded the requested documents for ${app.job.role}.`, `/applicants?jobId=${app.jobId}`);
    }

    res.status(201).json(created);
  } catch (error: any) {
    logger.error(error);
    res.status(500).json({ error: error.message || 'Failed to upload documents' });
  }
});

// ─── POST /api/applications/:id/offer-letter ─────────────────────────────────
// Recruiter uploads offer letter PDF to Cloudinary, returns URL
router.post('/:id/offer-letter', requireAuth, requireRole('RECRUITER'), requireNotPlanSuspended, wrapMulter(offerLetterUpload.single('offerLetter')), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No offer letter file provided' }); return; }
    if (!(await validateUploadMagicBytes(file.buffer, PDF_ONLY_DETECTED_MIMES))) {
      res.status(400).json({ error: 'Invalid file type. Only PDF is allowed for offer letters.' });
      return;
    }

    const app = await prisma.application.findUnique({
      where: { id: String(req.params.id) },
      include: { job: true },
    });
    if (!app) { res.status(404).json({ error: 'Application not found' }); return; }
    if (!req.user!.hospitalId || app.job.hospitalId !== req.user!.hospitalId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    const timestamp = Date.now();
    const publicId = `offer_${app.id}_${timestamp}`;
    const result = await uploadRawBuffer(file.buffer, 'applications/offer-letters', publicId);

    // Persist to application immediately
    await prisma.application.update({
      where: { id: app.id },
      data: {
        offerLetterUrl: result.secure_url,
        offerLetterCloudinaryId: result.public_id,
      },
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      name: file.originalname,
      mime: file.mimetype,
    });
  } catch (error: any) {
    logger.error(error);
    res.status(500).json({ error: error.message || 'Failed to upload offer letter' });
  }
});

// ─── R6: Serve uploaded CV — recruiter-only, ownership-gated ─────────────────
function isAllowedCloudinaryUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.cloudinary.com');
  } catch {
    return false;
  }
}

function assertStoredCvOwnedByCandidate(
  candidateId: string,
  cvUrl: string | null | undefined,
  cvCloudinaryId: string | null | undefined,
): { ok: true } | { ok: false; error: string } {
  if (!cvUrl && !cvCloudinaryId) {
    return { ok: false, error: 'No uploaded CV for this application.' };
  }
  const ownership = validateCandidateOwnsCv(candidateId, cvUrl, cvCloudinaryId);
  if (!ownership.ok) {
    return ownership;
  }
  if (cvUrl && !isAllowedCloudinaryUrl(cvUrl)) {
    return { ok: false, error: 'Invalid CV storage URL' };
  }
  return { ok: true };
}

// GET /api/applications/:applicationId/uploaded-cv
router.get('/:applicationId/uploaded-cv', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId } = req.params;
    const recruiterId = req.user!.id;
    const hospitalId  = req.user!.hospitalId;

    if (!hospitalId) {
      res.status(403).json({ error: 'No hospital associated with this recruiter account' });
      return;
    }

    // Verify the application exists AND belongs to a job posted by this recruiter's hospital
    const application = await prisma.application.findUnique({
      where: { id: String(applicationId) },
      include: {
        job: { select: { hospitalId: true } },
        candidate: {
          select: {
            uploadedCvMime: true,
            uploadedCvName: true,
            cvUrl: true,
            cvCloudinaryId: true,
          },
        },
      },
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    // Ownership check: the job must belong to the recruiter's hospital
    if (application.job.hospitalId !== hospitalId) {
      res.status(403).json({ error: 'You do not have access to this application' });
      return;
    }

    // Only uploaded CVs are served through this route
    if (application.cvSource !== 'upload') {
      res.status(404).json({ error: 'No uploaded CV for this application — candidate used the structured profile.' });
      return;
    }

    const cvData = application.uploadedCvData;
    const cvMime = application.uploadedCvMime ?? application.candidate?.uploadedCvMime ?? 'application/pdf';
    const cvName = application.uploadedCvName ?? application.candidate?.uploadedCvName ?? 'cv.pdf';
    const cvUrl = application.cvUrl ?? application.candidate?.cvUrl;
    const cvCloudinaryId = application.cvCloudinaryId ?? application.candidate?.cvCloudinaryId;

    // Audit log: security-sensitive file access
    logger.info(`[cv-access] recruiter=${recruiterId} hospital=${hospitalId} application=${applicationId} file=${cvName}`);

    if (cvData) {
      // Strip optional data-URI prefix (e.g. "data:application/pdf;base64,")
      const base64 = cvData.includes(',') ? cvData.split(',')[1] : cvData;
      const buffer = Buffer.from(base64, 'base64');

      res.set({
        'Content-Type': cvMime,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(cvName)}"`,
        'Content-Length': buffer.length,
        'Cache-Control': 'private, no-store',
      });
      res.status(200).send(buffer);
      return;
    }

    // Cloudinary fallback — candidate upload flow stores cvUrl, not base64
    if (cvUrl || cvCloudinaryId) {
      const storedCvCheck = assertStoredCvOwnedByCandidate(
        application.candidateId,
        cvUrl,
        cvCloudinaryId,
      );
      if (!storedCvCheck.ok) {
        res.status(400).json({ error: storedCvCheck.error });
        return;
      }
      if (!cvUrl) {
        res.status(404).json({ error: 'Uploaded CV URL not found for this application' });
        return;
      }

      const cloudRes = await fetch(cvUrl);
      if (!cloudRes.ok) {
        res.status(502).json({ error: 'Failed to retrieve CV from storage' });
        return;
      }

      const buffer = Buffer.from(await cloudRes.arrayBuffer());
      res.set({
        'Content-Type': cvMime,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(cvName)}"`,
        'Content-Length': buffer.length,
        'Cache-Control': 'private, no-store',
      });
      res.status(200).send(buffer);
      return;
    }

    res.status(404).json({ error: 'Uploaded CV data not found for this application' });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to retrieve uploaded CV' });
  }
});

export default router;
