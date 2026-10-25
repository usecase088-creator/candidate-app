import { Router, Response } from 'express';
import prisma from '../../lib/prisma';
import { requireAdmin, AdminAuthRequest } from '../../middleware/auth';

const router = Router();

// GET /api/admin/gov-jobs — list all (admin only)
router.get('/gov-jobs', requireAdmin, async (_req: AdminAuthRequest, res: Response) => {
  try {
    const jobs = await prisma.govJob.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(jobs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch government jobs' });
  }
});

// POST /api/admin/gov-jobs — create
router.post('/gov-jobs', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  const { examAuthority, name, lastDate, link } = req.body;
  if (!examAuthority || !name || !link) {
    res.status(400).json({ error: 'examAuthority, name, and link are required' });
    return;
  }
  try {
    const job = await prisma.govJob.create({
      data: {
        examAuthority: String(examAuthority).trim(),
        name: String(name).trim(),
        lastDate: lastDate ? new Date(lastDate) : null,
        link: String(link).trim(),
      },
    });
    res.status(201).json(job);
  } catch {
    res.status(500).json({ error: 'Failed to create government job' });
  }
});

// DELETE /api/admin/gov-jobs/:id
router.delete('/gov-jobs/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    await prisma.govJob.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Government job not found' });
  }
});

export default router;
