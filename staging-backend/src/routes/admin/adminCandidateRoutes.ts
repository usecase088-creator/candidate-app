import logger from '../../lib/logger';
import { Router, Response } from 'express';
import prisma from '../../lib/prisma';
import { requireAdmin, AdminAuthRequest } from '../../middleware/auth';

const router = Router();

// GET /api/admin/candidates
router.get('/candidates', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const take = parseInt(req.query.take as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    const [total, candidates] = await prisma.$transaction([
      prisma.candidate.count({ where: { deletedAt: null } }),
      prisma.candidate.findMany({
        where: { deletedAt: null },
        include: {
          _count: {
            select: { applications: true }
          },
          // Join user so we always get the canonical email + phone (mobile)
          user: { select: { email: true, mobile: true, isSuspended: true } }
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip
      })
    ]);

    // Merge user.email and user.mobile into the candidate object (same as detail endpoint)
    const data = candidates.map((c: any) => ({
      ...c,
      email: c.user?.email || c.email,
      phone: c.user?.mobile || c.phone,
      isSuspended: c.isSuspended || c.user?.isSuspended || false,
    }));

    res.json({ data, total, take, skip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// GET /api/admin/candidates/:id
router.get('/candidates/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        applications: {
          include: { job: { include: { hospital: true } } },
          orderBy: { appliedOn: 'desc' }
        },
        user: { select: { email: true, mobile: true, isSuspended: true, deletedAt: true } }
      }
    });

    if (!candidate) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }

    res.json({
      ...candidate,
      email: candidate.user?.email || candidate.email,
      phone: candidate.user?.mobile || candidate.phone,
      isSuspended: candidate.isSuspended || candidate.user?.isSuspended || false,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch candidate details' });
  }
});

// PATCH /api/admin/candidates/:id/suspend
router.patch('/candidates/:id/suspend', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const candidate = await prisma.candidate.findUnique({ where: { id } });
    if (!candidate) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }

    const updated = await prisma.candidate.update({
      where: { id },
      data: { isSuspended: true }
    });

    if (candidate.userId) {
      await prisma.user.update({
        where: { id: candidate.userId },
        data: { isSuspended: true }
      });
    }

    await prisma.activityLog.create({
      data: {
        entityType: 'candidate',
        entityId: updated.id,
        action: 'suspended',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ reason: 'Admin suspended candidate' })
      }
    });
    res.json(updated);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to suspend candidate' });
  }
});

// PATCH /api/admin/candidates/:id/reactivate
router.patch('/candidates/:id/reactivate', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const candidate = await prisma.candidate.findUnique({ where: { id } });
    if (!candidate) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }

    const updated = await prisma.candidate.update({
      where: { id },
      data: { isSuspended: false }
    });

    if (candidate.userId) {
      await prisma.user.update({
        where: { id: candidate.userId },
        data: { isSuspended: false }
      });
    }

    await prisma.activityLog.create({
      data: {
        entityType: 'candidate',
        entityId: updated.id,
        action: 'reactivated',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ reason: 'Admin reactivated candidate' })
      }
    });
    res.json(updated);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to reactivate candidate' });
  }
});

// DELETE /api/admin/candidates/:id
router.delete('/candidates/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const now = new Date();

    const candidate = await prisma.candidate.findUnique({ where: { id } });
    if (!candidate) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }

    const updated = await prisma.candidate.update({
      where: { id },
      data: { deletedAt: now }
    });

    if (candidate.userId) {
      await prisma.user.update({
        where: { id: candidate.userId },
        data: { deletedAt: now }
      });
    }

    await prisma.activityLog.create({
      data: {
        entityType: 'candidate',
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
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

// PATCH /api/admin/candidates/:id/verify
router.patch('/candidates/:id/verify', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = await prisma.candidate.update({
      where: { id },
      data: { verified: true },
    });
    await prisma.activityLog.create({
      data: {
        entityType: 'candidate',
        entityId: id,
        action: 'verified',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ name: updated.name }),
      },
    });
    res.json({ success: true, candidate: updated });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to verify candidate' });
  }
});

// PATCH /api/admin/candidates/:id/unverify
router.patch('/candidates/:id/unverify', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = await prisma.candidate.update({
      where: { id },
      data: { verified: false },
    });
    await prisma.activityLog.create({
      data: {
        entityType: 'candidate',
        entityId: id,
        action: 'unverified',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ name: updated.name }),
      },
    });
    res.json({ success: true, candidate: updated });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to unverify candidate' });
  }
});

export default router;
