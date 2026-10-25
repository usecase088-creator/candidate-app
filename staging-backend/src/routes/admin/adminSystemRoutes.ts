import logger from '../../lib/logger';
import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';
import { requireAdmin, AdminAuthRequest } from '../../middleware/auth';
import { suspendHospitalRecruitersAndCloseJobs } from '../../lib/hospitalSuspend';

const router = Router();
const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('FATAL: JWT_SECRET environment variable is not set.');
const VERIFIED_SECRET = SECRET as string;

// GET /api/admin/logs
router.get('/logs', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const take = parseInt(req.query.take as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;
    const entityType = req.query.entityType as string;
    const actorRole = req.query.actorRole as string;
    const action = req.query.action as string;

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (actorRole) where.actorRole = actorRole;
    if (action) where.action = action;

    const [total, rawLogs] = await prisma.$transaction([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip
      })
    ]);

    const adminIds = [...new Set(rawLogs.filter(l => l.actorRole === 'ADMIN').map(l => l.actorId))].filter((id): id is string => id !== null);
    const userIds = [...new Set(rawLogs.filter(l => l.actorRole !== 'ADMIN').map(l => l.actorId))].filter((id): id is string => id !== null);

    const admins = adminIds.length ? await prisma.adminUser.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true } }) : [];
    const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];

    const adminMap = Object.fromEntries(admins.map(a => [a.id, a.name]));
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

    const logs = rawLogs.map(l => ({
      id: l.id,
      entityType: l.entityType,
      entityId: l.entityId,
      action: l.action,
      actorName: l.actorRole === 'ADMIN' ? (l.actorId ? adminMap[l.actorId] || 'Unknown Admin' : 'Unknown Admin') : (l.actorId ? userMap[l.actorId] || 'Unknown User' : 'Unknown User'),
      actorRole: l.actorRole,
      meta: l.meta,
      createdAt: l.createdAt
    }));

    res.json({ data: logs, total, take, skip });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// GET /api/admin/subscriptions
router.get('/subscriptions', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const take = parseInt(req.query.take as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    const [total, subscriptions] = await prisma.$transaction([
      prisma.hospital.count({ where: { deletedAt: null } }),
      prisma.hospital.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          onboardingPlan: true,
          planExpiresAt: true,
          isSuspended: true,
          planChangeLogs: {
            where: { paymentStatus: 'Paid' },
            select: { amountPaid: true }
          }
        },
        orderBy: { planExpiresAt: 'asc' },
        take,
        skip
      })
    ]);

    const mappedSubscriptions = subscriptions.map((sub) => {
      let daysRemaining = 0;
      let isExpired = false;
      if (sub.planExpiresAt) {
        const diff = new Date(sub.planExpiresAt).getTime() - Date.now();
        daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        isExpired = diff < 0;
      }

      const totalPaid = sub.planChangeLogs.reduce((sum, entry) => sum + (entry.amountPaid || 0), 0);

      return {
        id: sub.id,
        name: sub.name,
        currentPlan: sub.onboardingPlan,
        planExpiresAt: sub.planExpiresAt,
        daysRemaining,
        isExpired,
        isSuspended: sub.isSuspended,
        totalPaid
      };
    });

    res.json({ data: mappedSubscriptions, total, take, skip });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// GET /api/admin/subscriptions/:hospitalId/history
router.get('/subscriptions/:hospitalId/history', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const history = await prisma.planChangeLog.findMany({
      where: { hospitalId: req.params.hospitalId as string },
      orderBy: { requestedAt: 'desc' }
    });
    res.json(history);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch subscription history' });
  }
});

// POST /api/admin/subscriptions/:hospitalId/suspend
router.post('/subscriptions/:hospitalId/suspend', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const updated = await prisma.hospital.update({
      where: { id: req.params.hospitalId as string },
      data: { isSuspended: true }
    });

    await suspendHospitalRecruitersAndCloseJobs(updated.id);

    await prisma.activityLog.create({
      data: {
        entityType: 'subscription',
        entityId: updated.id,
        action: 'suspended',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ reason: 'Admin suspended subscription' })
      }
    });

    res.json({ success: true, isSuspended: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to suspend subscription' });
  }
});

// POST /api/admin/subscriptions/:hospitalId/reactivate
router.post('/subscriptions/:hospitalId/reactivate', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const updated = await prisma.hospital.update({
      where: { id: req.params.hospitalId as string },
      data: { isSuspended: false }
    });

    await prisma.user.updateMany({
      where: { hospitalId: updated.id, role: 'RECRUITER' },
      data: { isSuspended: false }
    });

    await prisma.activityLog.create({
      data: {
        entityType: 'subscription',
        entityId: updated.id,
        action: 'reactivated',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ reason: 'Admin reactivated subscription' })
      }
    });

    res.json({ success: true, isSuspended: false });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

// GET /api/admin/revenue
router.get('/revenue', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    // Only fetch successful payments
    const revenueLogs = await prisma.planChangeLog.findMany({
      where: { paymentStatus: 'Paid' },
      orderBy: { effectiveAt: 'asc' }
    });

    res.json(revenueLogs);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch revenue' });
  }
});

// POST /api/admin/impersonate/:userId
router.post('/impersonate/:userId', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const userId = req.params.userId as string;

    // Ensure the target exists and is not suspended/deleted
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (targetUser.role === 'ADMIN') {
      res.status(403).json({ error: 'Cannot impersonate another admin' });
      return;
    }

    if (targetUser.isSuspended || targetUser.deletedAt) {
      res.status(403).json({ error: 'Cannot impersonate a suspended or deleted user' });
      return;
    }

    // Generate token with impersonation flag
    const token = jwt.sign(
      {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        hospitalId: targetUser.hospitalId,
        tokenVersion: targetUser.tokenVersion,
        isImpersonated: true,
        impersonatedBy: req.admin!.id
      },
      VERIFIED_SECRET,
      { expiresIn: '1h' } // Short-lived token
    );

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Log the impersonation action
    await prisma.$transaction([
      prisma.impersonationLog.create({
        data: {
          adminId: req.admin!.id,
          targetUserId: targetUser.id,
          targetRole: targetUser.role,
          targetEmail: targetUser.email,
          expiresAt
        }
      }),
      prisma.activityLog.create({
        data: {
          entityType: 'user',
          entityId: targetUser.id,
          action: 'impersonation',
          actorId: req.admin!.id,
          actorRole: 'ADMIN',
          meta: JSON.stringify({ targetRole: targetUser.role, targetEmail: targetUser.email })
        }
      })
    ]);

    res.json({ token, user: { id: targetUser.id, name: targetUser.name, email: targetUser.email, role: targetUser.role, hospitalId: targetUser.hospitalId } });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to impersonate user' });
  }
});

export default router;
