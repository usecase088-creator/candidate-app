import logger from '../../lib/logger';
import { Router, Response } from 'express';
import prisma from '../../lib/prisma';
import { requireAdmin, AdminAuthRequest } from '../../middleware/auth';
import { TERMINAL_APP_STATUSES } from '../../lib/applicationStatuses';

const router = Router();

// GET /api/admin/jobs
router.get('/jobs', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const take = parseInt(req.query.take as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;
    const hospitalId = req.query.hospitalId as string;
    const status = req.query.status as string;

    const where: any = {};
    if (hospitalId) where.hospitalId = hospitalId;
    if (status) where.status = status;

    const [total, jobs] = await prisma.$transaction([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        include: { hospital: true, postedBy: true },
        orderBy: { createdAt: 'desc' },
        take,
        skip
      })
    ]);

    // Map to match admin UI store expectations
    const mappedJobs = jobs.map((job) => ({
      id: job.id,
      title: job.role,
      hospitalId: job.hospitalId,
      recruiterId: job.postedById || '',
      location: job.location,
      status: job.status,
      isFlagged: job.isFlagged || false,
      posted: job.postedOn ? new Date(job.postedOn).toISOString().slice(0, 10) : ''
    }));

    res.json({ data: mappedJobs, total, take, skip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// PATCH /api/admin/jobs/:id/status
router.patch('/jobs/:id/status', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (status === 'Closed') {
      await prisma.application.updateMany({
        where: {
          jobId: id,
          status: { notIn: [...TERMINAL_APP_STATUSES] },
        },
        data: { status: 'JobClosed' },
      });
    }

    const updated = await prisma.job.update({
      where: { id },
      data: { status }
    });

    await prisma.activityLog.create({
      data: {
        entityType: 'job',
        entityId: updated.id,
        action: 'status_updated',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ status })
      }
    });
    res.json(updated);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

// DELETE /api/admin/jobs/:id
router.delete('/jobs/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const deleted = await prisma.job.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        entityType: 'job',
        entityId: deleted.id,
        action: 'deleted',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ title: deleted.role })
      }
    });
    res.json({ success: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// PATCH /api/admin/jobs/:id/flag
router.patch('/jobs/:id/flag', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    const updated = await prisma.job.update({
      where: { id },
      data: { isFlagged: !job.isFlagged }
    });
    res.json({ success: true, isFlagged: updated.isFlagged });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to toggle job flag' });
  }
});

// GET /api/admin/applications
router.get('/applications', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const take = parseInt(req.query.take as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;
    const jobId = req.query.jobId as string;
    const candidateId = req.query.candidateId as string;
    const hospitalId = req.query.hospitalId as string;
    const status = req.query.status as string;

    const where: any = {};
    if (jobId) where.jobId = jobId;
    if (candidateId) where.candidateId = candidateId;
    if (hospitalId) where.job = { hospitalId };
    if (status) where.status = status;

    const [total, applications] = await prisma.$transaction([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        include: {
          candidate: true,
          job: { include: { hospital: true } }
        },
        orderBy: { appliedOn: 'desc' },
        take,
        skip
      })
    ]);

    res.json({ data: applications, total, take, skip });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// GET /api/admin/applications/:id
router.get('/applications/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        candidate: true,
        job: { include: { hospital: true } },
      }
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    res.json(application);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch application details' });
  }
});

// PATCH /api/admin/applications/:id/status
router.patch('/applications/:id/status', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const VALID_STATUSES = [
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
    ];

    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Invalid or missing status' });
      return;
    }
    const updated = await prisma.application.update({
      where: { id },
      data: { status }
    });

    await prisma.activityLog.create({
      data: {
        entityType: 'application',
        entityId: id,
        action: 'status_override',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ newStatus: status })
      }
    });
    res.json(updated);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

// PATCH /api/admin/applications/:id/flag
router.patch('/applications/:id/flag', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }
    const updated = await prisma.application.update({
      where: { id },
      data: { isFlagged: !application.isFlagged }
    });
    res.json({ success: true, isFlagged: updated.isFlagged });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to toggle application flag' });
  }
});

export default router;