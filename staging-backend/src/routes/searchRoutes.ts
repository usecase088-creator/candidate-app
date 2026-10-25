import logger from '../lib/logger';
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { formatCandidate, getHospitalValidity } from '../lib/helpers';

const router = Router();

// GET /api/search/recruiter
router.get('/recruiter', requireAuth, requireRole('RECRUITER'), async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) {
    res.json([]);
    return;
  }
  
  try {
    const hospitalId = authReq.user?.hospitalId;
    if (hospitalId) {
      const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
      if (hospital) {
        const { isLocked } = getHospitalValidity(hospital);
        if (isLocked) {
          res.status(403).json({ error: 'Your account validity has expired. You cannot search candidates.', code: 'PLAN_EXPIRED' });
          return;
        }
      }
    }
    
    const candidates = await prisma.candidate.findMany({
      where: {
        isSuspended: false,
        deletedAt: null,
      },
      take: 100
    });
    const filtered = candidates.filter((candidate) =>
      [
        candidate.name,
        candidate.role,
        candidate.specialty,
        candidate.location,
        candidate.summary,
        candidate.skills,
        candidate.education,
        candidate.profileJson,
      ].map((value) => String(value ?? '').toLowerCase()).join(' ').includes(q),
    ).slice(0, 20);
    res.json(filtered.map((candidate) => formatCandidate(candidate, { redactContact: true })));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
