import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/intl-jobs — public, no auth required
router.get('/', async (_req: Request, res: Response) => {
  try {
    const jobs = await prisma.internationalJob.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(jobs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch international jobs' });
  }
});

export default router;
