import logger from '../../lib/logger';
import { Router, Response } from 'express';
import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { requireAdmin, AdminAuthRequest } from '../../middleware/auth';
import { sendApprovalEmail, sendRejectionEmail, sendRequestMoreDocsEmail } from '../../lib/email';
import { getRecruiterLimit } from '../../lib/helpers';
import { isDowngrade } from '../../lib/planBilling';
import { BILLING_CYCLE_DAYS, DEFAULT_PLAN_TIER, getJobLimit } from '../../config/plans';
import { suspendHospitalRecruitersAndCloseJobs, closeExcessActiveJobs } from '../../lib/hospitalSuspend';

const router = Router();

/** Generate a cryptographically-random 12-character alphanumeric invite code */
function generateInviteCode(): string {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

// GET /api/admin/hospitals
router.get('/hospitals', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const take = parseInt(req.query.take as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    const [total, hospitals] = await prisma.$transaction([
      prisma.hospital.count(),
      prisma.hospital.findMany({
        where: { deletedAt: null },
        orderBy: { submittedAt: 'desc' },
        include: {
          _count: {
            select: { jobs: true, users: true }
          }
        },
        take,
        skip
      })
    ]);
    res.json({ data: hospitals, total, take, skip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
});

// PATCH /api/admin/hospitals/:id/approve
// Approves the hospital onboarding and generates a unique 12-char invite code.
router.patch('/hospitals/:id/approve', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const hospital = await prisma.hospital.findUnique({ where: { id } });
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }

    if (!hospital.mobileVerified) {
      res.status(403).json({ error: 'Hospital mobile number has not been verified yet.' });
      return;
    }

    if (hospital.onboardingStatus === 'PendingPayment') {
      res.status(403).json({ error: 'Hospital has not completed plan payment yet.' });
      return;
    }

    // Generate a unique invite code — retry on collision (extremely rare)
    // ONLY generate a new code if the hospital doesn't already have one.
    let inviteCode: string = hospital.inviteCode || '';

    if (!inviteCode) {
      let attempts = 0;
      while (true) {
        inviteCode = generateInviteCode();
        const collision = await prisma.hospital.findUnique({ where: { inviteCode } });
        if (!collision) break;
        attempts++;
        if (attempts > 10) {
          res.status(500).json({ error: 'Could not generate a unique invite code. Please try again.' });
          return;
        }
      }
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + BILLING_CYCLE_DAYS);

    const [updated] = await prisma.$transaction([
      prisma.hospital.update({
        where: { id: req.params.id as string },
        data: {
          onboardingStatus: 'Approved',
          approvedAt: now,
          approvedBy: req.admin!.id,
          verified: true,
          verifiedOn: now.toISOString(),
          verifiedBy: req.admin!.name,
          inviteCode,
          planExpiresAt: expiresAt, // Initialize billing cycle
        }
      }),
      prisma.planChangeLog.create({
        data: {
          hospitalId: req.params.id as string,
          fromPlan: 'None',
          toPlan: hospital.onboardingPlan || DEFAULT_PLAN_TIER,
          changeType: 'renewal',
          amountPaid: 0,
          effectiveAt: now,
          paymentStatus: 'Waived',
          note: 'Initial plan assigned on hospital approval.',
        }
      })
    ]);

    // Notify any recruiters linked to this hospital (in case they were pre-linked somehow)
    const hospitalUsers = await prisma.user.findMany({
      where: { hospitalId: updated.id, role: 'RECRUITER' }
    });
    if (hospitalUsers.length > 0) {
      await prisma.inAppNotification.createMany({
        data: hospitalUsers.map(u => ({
          userId: u.id,
          title: 'Hospital Approved',
          message: `Your hospital "${updated.name}" has been approved. You can now post jobs.`,
        }))
      });
    }

    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
        entityId: updated.id,
        action: 'approved',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ inviteCode })
      }
    });

    // Send activation email with invite code (non-fatal — email failure must not crash the response)
    const emailAddress = updated.email || updated.submittedEmail || '';
    logger.info('[Email] Attempting approval email for hospital "%s" → recipient: "%s", inviteCode: "%s"',
      updated.name, emailAddress, updated.inviteCode);

    sendApprovalEmail(updated).catch(err => {
      logger.error('[Email] Approval email FAILED for hospital %s (%s): %s',
        updated.id, emailAddress, err?.message || JSON.stringify(err));
    });

    res.json(updated);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to approve hospital' });
  }
});

// PATCH /api/admin/hospitals/:id/reject
router.patch('/hospitals/:id/reject', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  // Accept 'reason' (preferred) or legacy 'note'
  const { reason, note } = req.body;
  const rejectionReason = (reason || note || '').toString().trim();
  try {
    const id = req.params.id as string;
    const updated = await prisma.hospital.update({
      where: { id },
      data: {
        onboardingStatus: 'Rejected',
        onboardingNote: rejectionReason || null,
      }
    });

    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
        entityId: updated.id,
        action: 'rejected',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ reason: rejectionReason })
      }
    });

    // Send rejection email (non-fatal)
    sendRejectionEmail(updated, rejectionReason).catch(err =>
      logger.error('[Email] Rejection email failed for hospital %s: %s', updated.id, err?.message || err)
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject hospital' });
  }
});

// PATCH /api/admin/hospitals/:id/request-more-documents
router.patch('/hospitals/:id/request-more-documents', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  const { requestedDocuments } = req.body;

  if (!requestedDocuments || !String(requestedDocuments).trim()) {
    res.status(400).json({ error: 'requestedDocuments is required — list the documents you need.' });
    return;
  }

  try {
    const id = req.params.id as string;

    const hospital = await prisma.hospital.findUnique({ where: { id } });
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }

    const updated = await prisma.hospital.update({
      where: { id },
      data: {
        onboardingStatus:   'RequestMoreDocuments',
        requestedDocuments: String(requestedDocuments).trim(),
      }
    });

    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
        entityId:   updated.id,
        action:     'request_more_documents',
        actorId:    req.admin!.id,
        actorRole:  'ADMIN',
        meta:       JSON.stringify({ requestedDocuments: String(requestedDocuments).trim() })
      }
    });

    // Send docs-request email (non-fatal)
    sendRequestMoreDocsEmail(updated, String(requestedDocuments).trim()).catch(err =>
      logger.error('[Email] Docs-request email failed for hospital %s: %s', updated.id, err?.message || err)
    );

    res.json(updated);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to request more documents' });
  }
});

// PATCH /api/admin/hospitals/:id/verify
router.patch('/hospitals/:id/verify', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const hospital = await prisma.hospital.findUnique({ where: { id } });
    if (!hospital) { res.status(404).json({ error: 'Hospital not found' }); return; }
    const updated = await prisma.hospital.update({
      where: { id },
      data: { verified: true, verifiedAt: new Date(), verifiedBy: req.admin!.name || 'Admin' },
    });
    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
        entityId: id,
        action: 'verified',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ hospitalName: updated.name }),
      },
    });
    res.json({ success: true, hospital: updated });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to verify hospital' });
  }
});

// PATCH /api/admin/hospitals/:id/unverify
router.patch('/hospitals/:id/unverify', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const hospital = await prisma.hospital.findUnique({ where: { id } });
    if (!hospital) { res.status(404).json({ error: 'Hospital not found' }); return; }
    const updated = await prisma.hospital.update({
      where: { id },
      data: { verified: false },
    });
    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
        entityId: id,
        action: 'unverified',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ hospitalName: updated.name }),
      },
    });
    res.json({ success: true, hospital: updated });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to unverify hospital' });
  }
});

// PATCH /api/admin/hospitals/:id/plan
// Manually override a hospital's plan and expiry date (useful for support/admin overrides)
router.patch('/hospitals/:id/plan', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  const { onboardingPlan, planExpiresAt, note } = req.body;

  if (!onboardingPlan) {
    res.status(400).json({ error: 'onboardingPlan is required.' });
    return;
  }

  try {
    const id = req.params.id as string;
    const hospital = await prisma.hospital.findUnique({ where: { id } });

    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }

    const isUnlimited = String(onboardingPlan) === 'Unlimited';
    const expiresAt = planExpiresAt
      ? new Date(planExpiresAt)
      : isUnlimited
        ? new Date('2099-12-31T23:59:59.999Z')
        : hospital.planExpiresAt;

    // Reject past expiry dates — must be today or in the future
    if (planExpiresAt && expiresAt && expiresAt < new Date()) {
      res.status(400).json({ error: 'Expiry date must be today or a future date.' });
      return;
    }

    // Determine new max recruiters based on plan (use canonical limits from helpers)
    const newMaxRecruiters = getRecruiterLimit(onboardingPlan);

    const [updated] = await prisma.$transaction([
      prisma.hospital.update({
        where: { id },
        data: {
          onboardingPlan: String(onboardingPlan),
          planExpiresAt: expiresAt,
          maxRecruiters: newMaxRecruiters,
          pendingPlan: null, // Clear any pending plan if admin overrides
          pendingPlanAt: null,
          pendingPlanPaymentRef: null,
        }
      }),
      prisma.user.updateMany({
        where: { hospitalId: id, role: 'RECRUITER' },
        data: {
          jobsPostedThisMonth: 0,
          premiumSearchesThisMonth: 0,
          currentMonthStartDate: new Date(),
          planSuspendedAt: null,
          planSuspendedReason: null,
        }
      }),
      prisma.planChangeLog.create({
        data: {
          hospitalId: id,
          fromPlan: hospital.onboardingPlan,
          toPlan: String(onboardingPlan),
          changeType: 'immediate_upgrade',
          amountPaid: 0,
          effectiveAt: new Date(),
          paymentStatus: 'Waived',
          note: note ? note : `Admin manual override: plan set to ${onboardingPlan}, expires ${expiresAt?.toISOString().slice(0, 10)}.`,
        }
      })
    ]);

    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
        entityId: updated.id,
        action: 'plan_overridden',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ onboardingPlan, planExpiresAt: expiresAt?.toISOString() })
      }
    });

    if (isDowngrade(hospital.onboardingPlan, String(onboardingPlan))) {
      await closeExcessActiveJobs(id, getJobLimit(String(onboardingPlan)));
    }

    res.json(updated);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to override hospital plan' });
  }
});

// POST /api/admin/hospitals/:id/upgrade-unlimited
// Admin one-click upgrade to Unlimited plan (lifetime validity, unlimited job posts).
router.post('/hospitals/:id/upgrade-unlimited', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  const { note } = req.body || {};
  try {
    const id = req.params.id as string;
    const hospital = await prisma.hospital.findUnique({ where: { id } });

    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }

    const lifetimeExpiry = new Date('2099-12-31T23:59:59.999Z');

    const [updated] = await prisma.$transaction([
      prisma.hospital.update({
        where: { id },
        data: {
          onboardingPlan: 'Unlimited',
          planExpiresAt: lifetimeExpiry,
          maxRecruiters: 999999,
          pendingPlan: null,
          pendingPlanAt: null,
          pendingPlanPaymentRef: null,
        }
      }),
      prisma.user.updateMany({
        where: { hospitalId: id, role: 'RECRUITER' },
        data: {
          jobsPostedThisMonth: 0,
          premiumSearchesThisMonth: 0,
          currentMonthStartDate: new Date(),
          planSuspendedAt: null,
          planSuspendedReason: null,
        }
      }),
      prisma.planChangeLog.create({
        data: {
          hospitalId: id,
          fromPlan: hospital.onboardingPlan,
          toPlan: 'Unlimited',
          changeType: 'immediate_upgrade',
          amountPaid: 0,
          effectiveAt: new Date(),
          paymentStatus: 'Waived',
          note: note || 'Admin upgraded hospital plan to Unlimited VIP (Lifetime with unlimited job posts).',
        }
      })
    ]);

    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
        entityId: updated.id,
        action: 'plan_upgraded_unlimited',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ onboardingPlan: 'Unlimited', planExpiresAt: lifetimeExpiry.toISOString() })
      }
    });

    res.json(updated);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to upgrade hospital to Unlimited plan' });
  }
});

// GET /api/admin/hospitals/:id
router.get('/hospitals/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const hospital = await prisma.hospital.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, jobs: true } }
      }
    });

    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }

    const planHistory = await prisma.planChangeLog.findMany({
      where: { hospitalId: id },
      orderBy: { requestedAt: 'desc' }
    });

    let daysRemaining = 0;
    if (hospital.planExpiresAt) {
      const diff = new Date(hospital.planExpiresAt).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    res.json({
      ...hospital,
      plan: hospital.onboardingPlan,
      daysRemaining,
      planHistory
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch hospital details' });
  }
});

// PATCH /api/admin/hospitals/:id/suspend
router.patch('/hospitals/:id/suspend', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = await prisma.hospital.update({
      where: { id },
      data: { isSuspended: true }
    });

    await suspendHospitalRecruitersAndCloseJobs(id);

    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
        entityId: updated.id,
        action: 'suspended',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ reason: 'Admin suspended hospital' })
      }
    });
    res.json(updated);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to suspend hospital' });
  }
});

// PATCH /api/admin/hospitals/:id/reactivate
router.patch('/hospitals/:id/reactivate', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = await prisma.hospital.update({
      where: { id },
      data: { isSuspended: false }
    });

    await prisma.user.updateMany({
      where: { hospitalId: id, role: 'RECRUITER' },
      data: { isSuspended: false }
    });

    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
        entityId: updated.id,
        action: 'reactivated',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ reason: 'Admin reactivated hospital' })
      }
    });
    res.json(updated);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to reactivate hospital' });
  }
});

// DELETE /api/admin/hospitals/:id
router.delete('/hospitals/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const now = new Date();

    const updated = await prisma.hospital.update({
      where: { id },
      data: { deletedAt: now }
    });

    // Soft-delete recruiters too
    await prisma.user.updateMany({
      where: { hospitalId: id, role: 'RECRUITER' },
      data: { deletedAt: now }
    });

    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
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
    res.status(500).json({ error: 'Failed to delete hospital' });
  }
});

export default router;