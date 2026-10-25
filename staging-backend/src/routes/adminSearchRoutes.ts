import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAdmin, AdminAuthRequest } from '../middleware/auth';
import logger from '../lib/logger';

const router = Router();

// GET /api/admin/search?q=&includeSuspended=false&includeDeleted=false
router.get('/search', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const includeSuspended = req.query.includeSuspended === 'true';
    const includeDeleted = req.query.includeDeleted === 'true';

    if (!q || q.length < 2) {
      res.json({ hospitals: [], recruiters: [], candidates: [], jobs: [] });
      return;
    }

    const searchQuery = `%${q}%`;

    // Base filters
    const hospitalFilter: any = { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] };
    const recruiterFilter: any = { role: 'RECRUITER', OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] };
    const candidateFilter: any = { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] };
    const jobFilter: any = { role: { contains: q, mode: 'insensitive' } };

    if (!includeSuspended) {
      hospitalFilter.isSuspended = false;
      recruiterFilter.isSuspended = false;
      candidateFilter.isSuspended = false;
    }

    if (!includeDeleted) {
      hospitalFilter.deletedAt = null;
      recruiterFilter.deletedAt = null;
      candidateFilter.deletedAt = null;
    }

    const [hospitals, recruiters, candidates, jobs] = await Promise.all([
      prisma.hospital.findMany({ where: hospitalFilter, take: 10 }),
      prisma.user.findMany({ where: recruiterFilter, take: 10, include: { hospital: true } }),
      prisma.candidate.findMany({ where: candidateFilter, take: 10 }),
      prisma.job.findMany({ where: jobFilter, take: 10, include: { hospital: true } })
    ]);

    res.json({
      hospitals,
      recruiters,
      candidates,
      jobs
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Global search failed' });
  }
});

export default router;
