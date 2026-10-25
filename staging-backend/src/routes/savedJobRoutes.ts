import logger from '../lib/logger';
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { formatJob } from '../lib/helpers';

const router = Router();

// GET /api/saved-jobs
router.get('/', requireAuth, requireRole('CANDIDATE'), async (req: AuthRequest, res: Response) => {
  try {
    const candidateId = req.user!.candidateId;
    if (!candidateId) {
      res.status(400).json({ error: 'No candidate profile linked' });
      return;
    }
    const savedJobs = await prisma.savedJob.findMany({
      where: { candidateId },
      include: { job: { include: { hospital: true, applications: true } } },
      orderBy: { savedAt: 'desc' },
    });
    res.json(savedJobs.map(sj => ({
      savedAt: sj.savedAt,
      job: formatJob(sj.job)
    })));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/saved-jobs
router.post('/', requireAuth, requireRole('CANDIDATE'), async (req: AuthRequest, res: Response) => {
  const { jobId } = req.body;
  const candidateId = req.user!.candidateId;
  if (!candidateId || !jobId) {
    res.status(400).json({ error: 'candidateId and jobId are required' });
    return;
  }
  try {
    const saved = await prisma.savedJob.create({
      data: { candidateId, jobId: String(jobId) },
      include: { job: { include: { hospital: true, applications: true } } },
    });
    res.status(201).json({ savedAt: saved.savedAt, job: formatJob(saved.job) });
  } catch (error: any) {
    logger.error(error);
    if (error?.code === 'P2002') {
      res.status(409).json({ error: 'Job already saved' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/saved-jobs/:jobId
router.delete('/:jobId', requireAuth, requireRole('CANDIDATE'), async (req: AuthRequest, res: Response) => {
  const candidateId = req.user!.candidateId;
  if (!candidateId) {
    res.status(400).json({ error: 'No candidate profile linked' });
    return;
  }
  try {
    await prisma.savedJob.delete({
      where: {
        candidateId_jobId: {
          candidateId,
          jobId: String(req.params.jobId),
        },
      },
    });
    res.status(200).json({ success: true });
  } catch (error: any) {
    logger.error(error);
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Saved job not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
