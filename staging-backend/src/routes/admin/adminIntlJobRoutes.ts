import { Router, Response } from 'express';
import prisma from '../../lib/prisma';
import { requireAdmin, AdminAuthRequest } from '../../middleware/auth';

const router = Router();

// GET /api/admin/intl-jobs — list all (admin only)
router.get('/intl-jobs', requireAdmin, async (_req: AdminAuthRequest, res: Response) => {
  try {
    const jobs = await prisma.internationalJob.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(jobs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch international jobs' });
  }
});

// POST /api/admin/intl-jobs — create
router.post('/intl-jobs', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  const {
    jobPosition, specialty, city, country, countryFlag,
    payscale, experience, qualification, license, visaSponsorship,
    applyLink, lastDate,
  } = req.body;

  if (!jobPosition || !specialty || !city || !country || !applyLink) {
    res.status(400).json({ error: 'jobPosition, specialty, city, country, and applyLink are required' });
    return;
  }

  try {
    const job = await prisma.internationalJob.create({
      data: {
        jobPosition: String(jobPosition).trim(),
        specialty: String(specialty).trim(),
        city: String(city).trim(),
        country: String(country).trim(),
        countryFlag: String(countryFlag || '🌍').trim(),
        payscale: String(payscale || '').trim(),
        experience: String(experience || '').trim(),
        qualification: String(qualification || '').trim(),
        license: String(license || '').trim(),
        visaSponsorship: String(visaSponsorship || 'TBD').trim(),
        applyLink: String(applyLink).trim(),
        lastDate: lastDate ? new Date(lastDate) : null,
      },
    });
    res.status(201).json(job);
  } catch {
    res.status(500).json({ error: 'Failed to create international job' });
  }
});

// PUT /api/admin/intl-jobs/:id — update
router.put('/intl-jobs/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  const {
    jobPosition, specialty, city, country, countryFlag,
    payscale, experience, qualification, license, visaSponsorship,
    applyLink, lastDate,
  } = req.body;

  try {
    const job = await prisma.internationalJob.update({
      where: { id: String(req.params.id) },
      data: {
        ...(jobPosition && { jobPosition: String(jobPosition).trim() }),
        ...(specialty && { specialty: String(specialty).trim() }),
        ...(city && { city: String(city).trim() }),
        ...(country && { country: String(country).trim() }),
        ...(countryFlag !== undefined && { countryFlag: String(countryFlag).trim() }),
        ...(payscale !== undefined && { payscale: String(payscale).trim() }),
        ...(experience !== undefined && { experience: String(experience).trim() }),
        ...(qualification !== undefined && { qualification: String(qualification).trim() }),
        ...(license !== undefined && { license: String(license).trim() }),
        ...(visaSponsorship !== undefined && { visaSponsorship: String(visaSponsorship).trim() }),
        ...(applyLink && { applyLink: String(applyLink).trim() }),
        lastDate: lastDate ? new Date(lastDate) : null,
      },
    });
    res.json(job);
  } catch {
    res.status(404).json({ error: 'International job not found' });
  }
});

// DELETE /api/admin/intl-jobs/:id
router.delete('/intl-jobs/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    await prisma.internationalJob.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'International job not found' });
  }
});

export default router;
