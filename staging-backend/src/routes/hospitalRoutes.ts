import logger from '../lib/logger';
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest, requireNotPlanSuspended } from '../middleware/auth';
import { formatHospital } from '../lib/helpers';

const router = Router();

// GET /api/hospitals/me
router.get('/me', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  try {
    const hospitalId = req.user!.hospitalId;
    if (!hospitalId) {
      res.status(404).json({ error: 'No hospital linked to your account' });
      return;
    }
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }
    res.json(formatHospital(hospital));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/hospitals/me
router.put('/me', requireAuth, requireRole('RECRUITER'), requireNotPlanSuspended, async (req: AuthRequest, res: Response) => {
  try {
    const hospitalId = req.user!.hospitalId;
    if (!hospitalId) {
      res.status(400).json({ error: 'No hospital linked to your account' });
      return;
    }
    
    // Fetch current to check if locked
    const current = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!current) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }

    const b = req.body;
    const data: Record<string, unknown> = {};
    
    // Profile lock enforcement: if verified, restrict fields (per client requirement)
    const isLocked = current.verified;

    // Fields allowed even if locked (recruiter's own local contact info/state/city/logo)
    if (b.city != null) data.city = String(b.city);
    if (b.state != null) data.state = String(b.state);
    if (b.logoUrl !== undefined) data.logoUrl = b.logoUrl ? String(b.logoUrl) : null;
    if (b.logoCloudinaryId !== undefined) data.logoCloudinaryId = b.logoCloudinaryId ? String(b.logoCloudinaryId) : null;
    
    // Fields that lock upon verification
    if (!isLocked) {
      if (b.name != null) data.name = String(b.name);
      if (b.shortName != null) data.shortName = String(b.shortName);
      if (b.type != null) data.type = String(b.type);
      if (b.address != null) data.address = String(b.address);
      if (b.phone != null) data.phone = String(b.phone);
      if (b.email != null) data.email = String(b.email);
      if (b.website != null) data.website = String(b.website);
      if (b.registrationNumber != null) data.registrationNumber = String(b.registrationNumber);
      if (b.beds != null) data.beds = Number(b.beds);
      if (b.founded != null) data.founded = Number(b.founded);
      if (b.about != null) data.about = String(b.about);
      if (b.specialties != null) data.specialties = JSON.stringify(b.specialties);
    }

    const hospital = await prisma.hospital.update({ where: { id: hospitalId }, data });
    res.json(formatHospital(hospital));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to update hospital profile' });
  }
});

export default router;
