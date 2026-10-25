import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/gov-jobs — public, no auth required
router.get('/', async (_req: Request, res: Response) => {
  try {
    const jobs = await prisma.govJob.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(jobs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch government jobs' });
  }
});

export default router;
