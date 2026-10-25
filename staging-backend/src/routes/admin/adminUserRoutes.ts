import logger from '../../lib/logger';
import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { requireAdmin, AdminAuthRequest } from '../../middleware/auth';

const router = Router();

/** Generate a cryptographically-random 12-character alphanumeric invite code (reused for temp passwords) */
function generateInviteCode(): string {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

// GET /api/admin/recruiters
router.get('/recruiters', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const take = parseInt(req.query.take as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    const hospitalId = req.query.hospitalId as string;
    const where: any = { role: 'RECRUITER', deletedAt: null };
    if (hospitalId) where.hospitalId = hospitalId;

    const [total, recruiters] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: { hospital: true },
        orderBy: { createdAt: 'desc' },
        take,
        skip
      })
    ]);
    res.json({ data: recruiters, total, take, skip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recruiters' });
  }
});

// GET /api/admin/recruiters/:id
router.get('/recruiters/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const recruiter = await prisma.user.findUnique({
      where: { id, role: 'RECRUITER' },
      include: {
        hospital: true,
      }
    });

    if (!recruiter) {
      res.status(404).json({ error: 'Recruiter not found' });
      return;
    }

    const jobsPosted = recruiter.hospitalId ? await prisma.job.findMany({
      where: { hospitalId: recruiter.hospitalId } // Jobs belong to hospital
    }) : [];

    const applications = recruiter.hospitalId ? await prisma.application.findMany({
      where: { job: { hospitalId: recruiter.hospitalId } }
    }) : [];

    const candidatesManaged = new Set(applications.map(a => a.candidateId)).size;
    const interviewsScheduled = applications.filter(a => a.status === 'InterviewScheduled').length;
    const interviewsCompleted = applications.filter(a => a.status === 'InterviewCompleted').length;

    res.json({
      ...recruiter,
      jobsPosted,
      candidatesManaged,
      interviewsScheduled,
      interviewsCompleted
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch recruiter details' });
  }
});

// PATCH /api/admin/recruiters/:id/suspend
router.patch('/recruiters/:id/suspend', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = await prisma.user.update({
      where: { id, role: 'RECRUITER' },
      data: { isSuspended: true }
    });

    await prisma.activityLog.create({
      data: {
        entityType: 'user',
        entityId: updated.id,
        action: 'suspended',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ reason: 'Admin suspended recruiter' })
      }
    });
    res.json(updated);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to suspend recruiter' });
  }
});

// PATCH /api/admin/recruiters/:id/reactivate
router.patch('/recruiters/:id/reactivate', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = await prisma.user.update({
      where: { id, role: 'RECRUITER' },
      data: { isSuspended: false }
    });

    await prisma.activityLog.create({
      data: {
        entityType: 'user',
        entityId: updated.id,
        action: 'reactivated',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ reason: 'Admin reactivated recruiter' })
      }
    });
    res.json(updated);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to reactivate recruiter' });
  }
});

// PATCH /api/admin/recruiters/:id/reset-password
router.patch('/recruiters/:id/reset-password', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { mode, newPassword } = req.body;

    let plainPassword = '';

    if (mode === 'custom') {
      if (!newPassword || newPassword.length < 8) {
        res.status(400).json({ error: 'Custom password must be at least 8 characters long.' });
        return;
      }
      if (!/[A-Z]/.test(newPassword)) {
        res.status(400).json({ error: 'Custom password must contain at least one uppercase letter.' });
        return;
      }
      if (!/[a-z]/.test(newPassword)) {
        res.status(400).json({ error: 'Custom password must contain at least one lowercase letter.' });
        return;
      }
      if (!/[^A-Za-z0-9]/.test(newPassword)) {
        res.status(400).json({ error: 'Custom password must contain at least one special character.' });
        return;
      }
      plainPassword = newPassword;
    } else {
      // mode === 'generate' (default)
      plainPassword = generateInviteCode() + 'X!'; // Random enough string
    }

    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const updated = await prisma.user.update({
      where: { id, role: 'RECRUITER' },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 } // Force logout existing sessions
      }
    });

    await prisma.activityLog.create({
      data: {
        entityType: 'user',
        entityId: updated.id,
        action: 'password_reset',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ mode: mode || 'generate' })
      }
    });

    if (mode === 'custom') {
      res.json({ success: true });
    } else {
      res.json({ success: true, temporaryPassword: plainPassword });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// DELETE /api/admin/recruiters/:id
router.delete('/recruiters/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const now = new Date();

    const updated = await prisma.user.update({
      where: { id, role: 'RECRUITER' },
      data: { deletedAt: now }
    });

    await prisma.activityLog.create({
      data: {
        entityType: 'user',
        entityId: updated.id,
        action: 'deleted',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ type: 'soft_delete' })
      }
    });
    res.json({ success: true, deletedAt: now });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to delete recruiter' });
  }
});

export default router;