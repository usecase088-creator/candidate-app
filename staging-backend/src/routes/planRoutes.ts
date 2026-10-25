import logger from '../lib/logger';
import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import {
  isUpgrade,
  isDowngrade,
  daysRemainingInCycle,
  computeUpgradeCost,
  computeUpgradeCostPreview,
  addDays,
} from '../lib/planBilling';
import { computeRecruiterActivationPlan, applyRecruiterActivationPlan } from '../lib/recruiterPlan';
import { closePlanExpiredActiveJobs } from '../lib/hospitalSuspend';
import { getRecruiterLimit } from '../lib/helpers';
import {
  isValidPlan,
  PLAN_ORDER,
  PLANS,
  PLAN_PRICES,
  BILLING_CYCLE_DAYS,
  getPlanPrice,
} from '../config/plans';

const router = Router();

// ─── GET /api/plan/catalog ───────────────────────────────────────────────────
// Public plan catalogue — limits and prices from config/plans.ts (no auth).
router.get('/catalog', (_req, res) => {
  res.json({
    billingCycleDays: BILLING_CYCLE_DAYS,
    planOrder: PLAN_ORDER,
    plans: Object.values(PLANS),
    planPrices: PLAN_PRICES,
  });
});

// All other plan routes require a logged-in recruiter
router.use(requireAuth, requireRole('RECRUITER'));

// ─── GET /api/plan/current ────────────────────────────────────────────────────
// Returns the hospital's current plan, expiry, pending plan, and cost preview.
router.get('/current', async (req: AuthRequest, res: Response) => {
  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: req.user!.hospitalId! },
    });
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }

    // Fallback for legacy hospitals without planExpiresAt
    let activeExpiresAt = hospital.planExpiresAt;
    if (!activeExpiresAt) {
      const start = hospital.approvedAt || hospital.submittedAt;
      if (start) {
        activeExpiresAt = new Date(start);
        activeExpiresAt.setDate(activeExpiresAt.getDate() + BILLING_CYCLE_DAYS);
      }
    }

    const daysRemaining = daysRemainingInCycle(activeExpiresAt);
    const upgradeCostPreview = computeUpgradeCostPreview(hospital.onboardingPlan, daysRemaining);

    res.json({
      plan:           hospital.onboardingPlan,
      planExpiresAt:  activeExpiresAt?.toISOString() ?? null,
      pendingPlan:    hospital.pendingPlan ?? null,
      pendingPlanAt:  hospital.pendingPlanAt?.toISOString() ?? null,
      daysRemaining,
      planPrices:     PLAN_PRICES,
      upgradeCostPreview,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to fetch plan info' });
  }
});

// ─── POST /api/plan/upgrade/immediate ────────────────────────────────────────
// Scenario 1: Immediate upgrade with pro-rated billing.
router.post('/upgrade/immediate', async (req: AuthRequest, res: Response) => {
  const { newPlan, paymentRef } = req.body as { newPlan?: string; paymentRef?: string };

  if (!newPlan || !isValidPlan(newPlan)) {
    res.status(400).json({ error: 'Invalid plan. Must be Basic, Pro, or Premium.' });
    return;
  }

  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: req.user!.hospitalId! },
    });
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }

    const currentPlan = hospital.onboardingPlan;

    // Fallback for legacy hospitals
    let activeExpiresAt = hospital.planExpiresAt;
    if (!activeExpiresAt) {
      const start = hospital.approvedAt || hospital.submittedAt;
      if (start) {
        activeExpiresAt = new Date(start);
        activeExpiresAt.setDate(activeExpiresAt.getDate() + BILLING_CYCLE_DAYS);
      }
    }

    const daysRemaining = daysRemainingInCycle(activeExpiresAt);
    const isExpired = daysRemaining <= 0;

    // If active, block non-upgrades
    if (!isExpired && !isUpgrade(currentPlan, newPlan)) {
      res.status(400).json({
        error: isDowngrade(currentPlan, newPlan)
          ? 'Downgrades cannot be applied immediately. Use the "Downgrade at Renewal" option.'
          : 'You are already on this plan and it is active.',
      });
      return;
    }

    // Immediate upgrade overwrites any pending plan (which is cleared in the transaction below).

    // Cost logic: if expired, pay full price. If active, pay pro-rated difference.
    const amountPaid = isExpired 
      ? (PLAN_PRICES[newPlan] ?? 0)
      : computeUpgradeCost(currentPlan, newPlan, daysRemaining);

    // Verify payment was actually completed
    if (amountPaid > 0) {
      if (!paymentRef || String(paymentRef).startsWith('mock_')) {
        res.status(402).json({ error: 'Valid payment is required to upgrade. Use /api/payment/create-order first.' });
        return;
      }
      
      const paymentOrder = await prisma.paymentOrder.findFirst({
        where: {
          hospitalId: hospital.id,
          planRequested: newPlan,
          status: 'PAID',
          razorpayOrderId: paymentRef, // paymentRef is now the razorpayOrderId
        }
      });

      if (!paymentOrder) {
        res.status(402).json({ error: 'Valid payment is required to upgrade. Use /api/payment/create-order first.' });
        return;
      }
    }

    // Apply immediately: update plan, extend cycle, update recruiter cap
    const newExpiresAt = addDays(BILLING_CYCLE_DAYS);
    const newMaxRecruiters = getRecruiterLimit(newPlan);

    const [updatedHospital] = await prisma.$transaction([
      prisma.hospital.update({
        where: { id: hospital.id },
        data: {
          onboardingPlan:  newPlan,
          planExpiresAt:   newExpiresAt,
          maxRecruiters:   newMaxRecruiters,
          pendingPlan:     null,
          pendingPlanAt:   null,
        },
      }),
      prisma.user.updateMany({
        where: { hospitalId: hospital.id, role: 'RECRUITER' },
        data: {
          jobsPostedThisMonth: 0,
          premiumSearchesThisMonth: 0,
          currentMonthStartDate: new Date(),
        },
      }),
      prisma.planChangeLog.create({
        data: {
          hospitalId:    hospital.id,
          fromPlan:      currentPlan,
          toPlan:        newPlan,
          changeType:    'immediate_upgrade',
          amountPaid,
          effectiveAt:   new Date(),
          paymentStatus: amountPaid === 0 ? 'Waived' : (paymentRef ? 'Paid' : 'Pending'),
          paymentRef:    paymentRef ?? null,
          note:          isDowngrade(currentPlan, newPlan)
            ? `Immediate downgrade to ${newPlan}.`
            : `Immediate upgrade. Pro-rated cost: ₹${amountPaid} for ${daysRemaining} days remaining.`,
        },
      }),
    ]);
    await closePlanExpiredActiveJobs(hospital.id);

    if (isDowngrade(currentPlan, newPlan)) {
      const planData = await computeRecruiterActivationPlan(hospital.id, newMaxRecruiters);
      await applyRecruiterActivationPlan(planData, `Immediate downgrade to ${newPlan}`);
    }

    // Notify all recruiters in this hospital
    const recruiters = await prisma.user.findMany({
      where: { hospitalId: hospital.id, role: 'RECRUITER' },
    });
    if (recruiters.length > 0) {
      await prisma.inAppNotification.createMany({
        data: recruiters.map((u) => ({
          userId:  u.id,
          title:   isDowngrade(currentPlan, newPlan) ? 'Plan Downgraded' : 'Plan Upgraded Successfully',
          message: isDowngrade(currentPlan, newPlan)
            ? `Your hospital plan has been downgraded from ${currentPlan} to ${newPlan}.`
            : `Your hospital plan has been upgraded from ${currentPlan} to ${newPlan}. New features are now active.`,
          link:    '/settings',
        })),
      });
    }

    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
        entityId:   hospital.id,
        action:     'plan_upgraded',
        actorId:    req.user!.id,
        actorRole:  'RECRUITER',
        meta:       JSON.stringify({ from: currentPlan, to: newPlan, amountPaid }),
      },
    });

    const newDaysRemaining = daysRemainingInCycle(newExpiresAt);
    res.json({
      plan:          newPlan,
      planExpiresAt: newExpiresAt.toISOString(),
      pendingPlan:   null,
      daysRemaining: newDaysRemaining,
      amountPaid,
      upgradeCostPreview: computeUpgradeCostPreview(newPlan, newDaysRemaining),
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to process upgrade' });
  }
});

// ─── POST /api/plan/upgrade/renewal ──────────────────────────────────────────
// Scenario 2: Schedule a plan change (upgrade or downgrade) at next renewal.
router.post('/upgrade/renewal', async (req: AuthRequest, res: Response) => {
  const { newPlan } = req.body as { newPlan?: string };

  if (!newPlan || !isValidPlan(newPlan)) {
    res.status(400).json({ error: 'Invalid plan. Must be Basic, Pro, or Premium.' });
    return;
  }

  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: req.user!.hospitalId! },
    });
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }

    if (hospital.onboardingPlan === newPlan) {
      res.status(400).json({ error: 'You are already on this plan.' });
      return;
    }

    // Renewal change overwrites any existing pending plan.
    // Note: paid upgrades at renewal are handled separately via
    // POST /api/payment/create-scheduled-upgrade-order + scheduled-upgrade-verify.
    // This endpoint is used only for free downgrades (e.g. Pro → Basic).

    // Fallback for legacy hospitals
    let activeExpiresAt = hospital.planExpiresAt;
    if (!activeExpiresAt) {
      const start = hospital.approvedAt || hospital.submittedAt;
      if (start) {
        activeExpiresAt = new Date(start);
        activeExpiresAt.setDate(activeExpiresAt.getDate() + BILLING_CYCLE_DAYS);
      }
    }

    const changeType = isDowngrade(hospital.onboardingPlan, newPlan)
      ? 'scheduled_downgrade'
      : 'scheduled_upgrade';

    const effectiveAt = activeExpiresAt ?? addDays(BILLING_CYCLE_DAYS);

    await prisma.$transaction([
      prisma.hospital.update({
        where: { id: hospital.id },
        data: {
          pendingPlan:  newPlan,
          pendingPlanAt: new Date(),
          planExpiresAt: activeExpiresAt, // Ensure DB has a real date for the cron job to match
        },
      }),
      prisma.planChangeLog.create({
        data: {
          hospitalId:    hospital.id,
          fromPlan:      hospital.onboardingPlan,
          toPlan:        newPlan,
          changeType,
          amountPaid:    null,
          effectiveAt,
          paymentStatus: 'Pending',
          note:          `Scheduled ${changeType.replace(/_/g, ' ')} at renewal on ${effectiveAt.toISOString().slice(0, 10)}.`,
        },
      }),
    ]);

    // Notify recruiters
    const recruiters = await prisma.user.findMany({
      where: { hospitalId: hospital.id, role: 'RECRUITER' },
    });
    if (recruiters.length > 0) {
      const isDown = changeType === 'scheduled_downgrade';
      const expiryStr = effectiveAt.toISOString().slice(0, 10);
      await prisma.inAppNotification.createMany({
        data: recruiters.map((u) => ({
          userId:  u.id,
          title:   isDown ? 'Plan Downgrade Scheduled' : 'Plan Upgrade Scheduled',
          message: isDown
            ? `Your ${hospital.onboardingPlan} plan remains active until ${expiryStr}. ${newPlan} plan starts after that.`
            : `Your plan will upgrade to ${newPlan} at your next renewal on ${expiryStr}.`,
          link: '/settings',
        })),
      });
    }

    res.json({
      plan:          hospital.onboardingPlan,
      planExpiresAt: activeExpiresAt?.toISOString() ?? null,
      pendingPlan:   newPlan,
      pendingPlanAt: new Date().toISOString(),
      daysRemaining: daysRemainingInCycle(activeExpiresAt),
      effectiveAt:   effectiveAt.toISOString(),
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to schedule plan change' });
  }
});

// ─── DELETE /api/plan/upgrade/renewal ────────────────────────────────────────
// Cancel a scheduled renewal change.
router.delete('/upgrade/renewal', async (req: AuthRequest, res: Response) => {
  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: req.user!.hospitalId! },
    });
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }

    if (!hospital.pendingPlan) {
      res.status(400).json({ error: 'No scheduled plan change to cancel.' });
      return;
    }

    await prisma.hospital.update({
      where: { id: hospital.id },
      data: { pendingPlan: null, pendingPlanAt: null },
    });

    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
        entityId:   hospital.id,
        action:     'plan_change_cancelled',
        actorId:    req.user!.id,
        actorRole:  'RECRUITER',
        meta:       JSON.stringify({ cancelledPendingPlan: hospital.pendingPlan }),
      },
    });

    // Fallback for legacy hospitals
    let activeExpiresAt = hospital.planExpiresAt;
    if (!activeExpiresAt) {
      const start = hospital.approvedAt || hospital.submittedAt;
      if (start) {
        activeExpiresAt = new Date(start);
        activeExpiresAt.setDate(activeExpiresAt.getDate() + BILLING_CYCLE_DAYS);
      }
    }

    res.json({
      plan:          hospital.onboardingPlan,
      planExpiresAt: activeExpiresAt?.toISOString() ?? null,
      pendingPlan:   null,
      daysRemaining: daysRemainingInCycle(activeExpiresAt),
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to cancel scheduled plan change' });
  }
});

// ─── GET /api/plan/history ────────────────────────────────────────────────────
// Returns PlanChangeLog entries for this hospital, newest first.
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.planChangeLog.findMany({
      where:   { hospitalId: req.user!.hospitalId! },
      orderBy: { requestedAt: 'desc' },
      take:    50,
    });
    res.json({ data: logs });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to fetch plan history' });
  }
});

// ─── GET /api/plan/downgrade-preview ────────────────────────────────────────
// Preview which recruiters will be suspended/activated if a plan is changed.
router.get('/downgrade-preview', async (req: AuthRequest, res: Response) => {
  const targetPlan = req.query.targetPlan as string;
  if (!targetPlan || !isValidPlan(targetPlan)) {
    res.status(400).json({ error: 'Invalid target plan.' });
    return;
  }

  try {
    const limit = getRecruiterLimit(targetPlan);
    const plan = await computeRecruiterActivationPlan(req.user!.hospitalId!, limit);
    
    const activeJobsCount = await prisma.job.count({
      where: { hospitalId: req.user!.hospitalId!, status: 'Active' },
    });

    res.json({
      targetPlan,
      accountsToSuspend: plan.toSuspend.map(u => ({ id: u.id, name: u.name, email: u.email })),
      accountsToKeepActive: plan.toActivate.concat(plan.remainingActive).map(u => ({ id: u.id, name: u.name, email: u.email })),
      willSuspend: plan.toSuspend.length,
      jobsToClose: activeJobsCount,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to preview downgrade' });
  }
});

// ─── POST /api/plan/reactivate-suspended ────────────────────────────────────
// Explicitly reactivates suspended accounts up to the current plan limit.
router.post('/reactivate-suspended', async (req: AuthRequest, res: Response) => {
  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: req.user!.hospitalId! },
    });
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }

    const limit = getRecruiterLimit(hospital.onboardingPlan);
    const plan = await computeRecruiterActivationPlan(hospital.id, limit);
    
    if (plan.toActivate.length === 0) {
      res.json({ message: 'No accounts to reactivate or limit already reached.', reactivatedCount: 0 });
      return;
    }

    await applyRecruiterActivationPlan(plan, 'Reactivated after plan upgrade');
    
    res.json({
      message: `Reactivated ${plan.toActivate.length} accounts.`,
      reactivatedCount: plan.toActivate.length,
      reactivatedAccounts: plan.toActivate.map(u => ({ id: u.id, name: u.name, email: u.email })),
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to reactivate accounts' });
  }
});

export default router;
