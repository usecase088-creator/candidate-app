import { Router, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { isUpgrade, daysRemainingInCycle, computeUpgradeCost, addDays, PLAN_PRICES, BILLING_CYCLE_DAYS } from '../lib/planBilling';
import { getRecruiterLimit } from '../lib/helpers';
import { closePlanExpiredActiveJobs } from '../lib/hospitalSuspend';
import { isValidPlan } from '../config/plans';
import Razorpay from 'razorpay';

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

if (!razorpayKeyId || !razorpayKeySecret) {
  throw new Error('FATAL: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set.');
}

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

const router = Router();

// ─── POST /api/payment/create-order ──────────────────────────────────────────
// Creates a Razorpay order for an immediate plan upgrade. Test-mode keys are
// supported via env, but no hardcoded payment fallback is allowed.
router.post('/create-order', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
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

    const currentPlan = hospital.onboardingPlan;

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

    if (!isExpired && !isUpgrade(currentPlan, newPlan)) {
      res.status(400).json({ error: 'You are already on this plan and it is active.' });
      return;
    }

    if (hospital.pendingPlan) {
      res.status(409).json({ error: 'A plan change is already scheduled. Please contact admin.' });
      return;
    }

    const amount = isExpired 
      ? (PLAN_PRICES[newPlan] ?? 0) 
      : computeUpgradeCost(currentPlan, newPlan, daysRemaining);

    if (amount <= 0) {
      res.status(400).json({ error: 'No payment required for this change.' });
      return;
    }

    // Real Razorpay Order Creation
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // amount in paisa
      currency: 'INR',
      receipt: `receipt_${hospital.id.substring(0, 10)}_${Date.now()}`
    });

    const razorpayOrderId = rzpOrder.id;

    const order = await prisma.paymentOrder.create({
      data: {
        hospitalId: hospital.id,
        amount,
        currency: 'INR',
        razorpayOrderId,
        status: 'CREATED',
        planRequested: newPlan
      }
    });

    res.json({ orderId: order.razorpayOrderId, amount: order.amount, currency: order.currency, keyId: razorpayKeyId });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// ─── POST /api/payment/verify ────────────────────────────────────────────────
// Verifies Razorpay signature and processes the upgrade
router.post('/verify', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: 'Missing payment details' });
    return;
  }

  try {
    const order = await prisma.paymentOrder.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
      include: { hospital: true },
    });

    if (!order) {
      res.status(400).json({ error: 'Invalid or already processed order' });
      return;
    }
    if (order.hospitalId !== req.user!.hospitalId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const generatedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // Strict signature validation (pure computation — outside transaction)
    const expected = Buffer.from(generatedSignature);
    const received = Buffer.from(String(razorpay_signature));
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      if (order.status === 'CREATED') {
        await prisma.paymentOrder.update({
          where: { id: order.id },
          data: { status: 'FAILED' },
        });
      }
      res.status(400).json({ error: 'Invalid payment signature' });
      return;
    }

    // Idempotent retry: order already paid — do not re-run upgrade
    if (order.status === 'PAID') {
      res.json({ success: true, plan: order.hospital.onboardingPlan, amountPaid: order.amount });
      return;
    }

    if (order.status !== 'CREATED') {
      res.status(400).json({ error: 'Invalid or already processed order' });
      return;
    }

    const newPlan = order.planRequested;
    const currentPlan = order.hospital.onboardingPlan;
    const newExpiresAt = addDays(BILLING_CYCLE_DAYS);
    const newMaxRecruiters = getRecruiterLimit(newPlan);

    type TxResult =
      | { kind: 'upgraded'; plan: string; amountPaid: number; fromPlan: string | null }
      | { kind: 'already_processed'; plan: string; amountPaid: number }
      | { kind: 'conflict' };

    const txResult: TxResult = await prisma.$transaction(async (tx) => {
      const flip = await tx.paymentOrder.updateMany({
        where: { id: order.id, status: 'CREATED' },
        data: { status: 'PAID' },
      });

      if (flip.count === 0) {
        const current = await tx.paymentOrder.findUnique({
          where: { id: order.id },
          include: { hospital: true },
        });
        if (current?.status === 'PAID') {
          return {
            kind: 'already_processed',
            plan: current.hospital.onboardingPlan,
            amountPaid: current.amount,
          };
        }
        return { kind: 'conflict' };
      }

      await tx.hospital.update({
        where: { id: order.hospital.id },
        data: {
          onboardingPlan: newPlan,
          planExpiresAt: newExpiresAt,
          maxRecruiters: newMaxRecruiters,
          pendingPlan: null,
          pendingPlanAt: null,
        },
      });
      await tx.user.updateMany({
        where: { hospitalId: order.hospital.id, role: 'RECRUITER' },
        data: {
          jobsPostedThisMonth: 0,
          premiumSearchesThisMonth: 0,
          currentMonthStartDate: new Date(),
        },
      });
      await tx.planChangeLog.create({
        data: {
          hospitalId: order.hospital.id,
          fromPlan: currentPlan,
          toPlan: newPlan,
          changeType: 'immediate_upgrade',
          amountPaid: order.amount,
          effectiveAt: new Date(),
          paymentStatus: 'Paid',
          paymentRef: razorpay_payment_id,
          note: `Immediate upgrade. Cost: ₹${order.amount}.`,
        },
      });

      return { kind: 'upgraded', plan: newPlan, amountPaid: order.amount, fromPlan: currentPlan };
    });

    if (txResult.kind === 'conflict') {
      res.status(400).json({ error: 'Invalid or already processed order' });
      return;
    }

    if (txResult.kind === 'upgraded') {
      await closePlanExpiredActiveJobs(order.hospital.id);
      await prisma.activityLog.create({
        data: {
          entityType: 'hospital',
          entityId: order.hospital.id,
          action: 'plan_upgraded',
          actorId: req.user!.id,
          actorRole: 'RECRUITER',
          meta: JSON.stringify({ from: txResult.fromPlan, to: newPlan, amountPaid: order.amount }),
        },
      });
    }

    const suspendedRecruiterCount = await prisma.user.count({
      where: { hospitalId: order.hospital.id, role: 'RECRUITER', planSuspendedAt: { not: null } }
    });

    res.json({ success: true, plan: txResult.plan, amountPaid: txResult.amountPaid, suspendedRecruiterCount });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// ─── POST /api/payment/create-prepay-order ────────────────────────────────────
// Creates a Razorpay order to pre-pay the current plan and extend the cycle by 30 days.
// Only allowed when the plan is currently ACTIVE (daysRemaining > 0).
router.post('/create-prepay-order', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: req.user!.hospitalId! },
    });
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }

    let activeExpiresAt = hospital.planExpiresAt;
    if (!activeExpiresAt) {
      const start = hospital.approvedAt || hospital.submittedAt;
      if (start) {
        activeExpiresAt = new Date(start);
        activeExpiresAt.setDate(activeExpiresAt.getDate() + BILLING_CYCLE_DAYS);
      }
    }

    const daysRemaining = daysRemainingInCycle(activeExpiresAt);
    if (daysRemaining <= 0) {
      res.status(400).json({ error: 'Your plan has already expired. Use the standard renewal flow instead.' });
      return;
    }

    const amount = PLAN_PRICES[hospital.onboardingPlan as keyof typeof PLAN_PRICES] ?? 0;
    if (amount <= 0) {
      res.status(400).json({ error: 'Your current plan is free. No payment required to extend.' });
      return;
    }

    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `prepay_${hospital.id.substring(0, 10)}_${Date.now()}`,
    });

    const order = await prisma.paymentOrder.create({
      data: {
        hospitalId: hospital.id,
        amount,
        currency: 'INR',
        razorpayOrderId: rzpOrder.id,
        status: 'CREATED',
        planRequested: `prepay:${hospital.onboardingPlan}`,
      },
    });

    res.json({ orderId: order.razorpayOrderId, amount: order.amount, currency: order.currency, keyId: razorpayKeyId });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to create prepay order' });
  }
});

// ─── POST /api/payment/prepay-verify ─────────────────────────────────────────
// Verifies Razorpay signature for a prepay order and extends planExpiresAt by
// BILLING_CYCLE_DAYS from the CURRENT expiry (not from now), preserving existing time.
router.post('/prepay-verify', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: 'Missing payment details' });
    return;
  }

  try {
    const order = await prisma.paymentOrder.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
      include: { hospital: true },
    });

    if (!order || !order.planRequested.startsWith('prepay:')) {
      res.status(400).json({ error: 'Invalid or unrecognised prepay order' });
      return;
    }
    if (order.hospitalId !== req.user!.hospitalId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Idempotent retry: already paid
    if (order.status === 'PAID') {
      res.json({ success: true, planExpiresAt: order.hospital.planExpiresAt?.toISOString() ?? null });
      return;
    }
    if (order.status !== 'CREATED') {
      res.status(400).json({ error: 'Invalid or already processed order' });
      return;
    }

    // Verify Razorpay signature
    const generatedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const expected = Buffer.from(generatedSignature);
    const received = Buffer.from(String(razorpay_signature));
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      await prisma.paymentOrder.update({ where: { id: order.id }, data: { status: 'FAILED' } });
      res.status(400).json({ error: 'Invalid payment signature' });
      return;
    }

    // Extend from current expiry (or now if legacy hospital has no expiry set)
    const currentExpiry = order.hospital.planExpiresAt ?? new Date();
    const newExpiresAt = new Date(currentExpiry);
    newExpiresAt.setDate(newExpiresAt.getDate() + BILLING_CYCLE_DAYS);
    newExpiresAt.setUTCHours(23, 59, 59, 999);

    const currentPlan = order.hospital.onboardingPlan;

    await prisma.$transaction(async (tx) => {
      await tx.paymentOrder.update({ where: { id: order.id }, data: { status: 'PAID' } });
      await tx.hospital.update({
        where: { id: order.hospital.id },
        data: { planExpiresAt: newExpiresAt },
      });
      await tx.planChangeLog.create({
        data: {
          hospitalId:    order.hospital.id,
          fromPlan:      currentPlan,
          toPlan:        currentPlan,
          changeType:    'prepay_renewal',
          amountPaid:    order.amount,
          effectiveAt:   new Date(),
          paymentStatus: 'Paid',
          paymentRef:    razorpay_payment_id,
          note: `Pre-pay renewal. ${BILLING_CYCLE_DAYS} days added to cycle. New expiry: ${newExpiresAt.toISOString().slice(0, 10)}. Cost: ₹${order.amount}.`,
        },
      });
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
        entityId:   order.hospital.id,
        action:     'plan_prepay_renewal',
        actorId:    req.user!.id,
        actorRole:  'RECRUITER',
        meta:       JSON.stringify({ plan: currentPlan, amountPaid: order.amount, newExpiresAt }),
      },
    });

    // Notify all recruiters
    const recruiters = await prisma.user.findMany({
      where: { hospitalId: order.hospital.id, role: 'RECRUITER' },
    });
    if (recruiters.length > 0) {
      await prisma.inAppNotification.createMany({
        data: recruiters.map((u) => ({
          userId:  u.id,
          title:   'Plan Extended',
          message: `Your ${currentPlan} plan has been pre-paid and extended to ${newExpiresAt.toISOString().slice(0, 10)}.`,
          link:    '/settings',
        })),
      });
    }

    res.json({ success: true, planExpiresAt: newExpiresAt.toISOString() });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to verify prepay payment' });
  }
});

// ─── POST /api/payment/create-scheduled-upgrade-order ────────────────────────
// Creates a Razorpay order for the FULL target plan price.
// Hospital pays now; plan activates at next renewal (not immediately).
// Only allowed when plan is active (daysRemaining > 0) and target is a paid upgrade.
router.post('/create-scheduled-upgrade-order', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
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

    const currentPlan = hospital.onboardingPlan;

    if (!isUpgrade(currentPlan, newPlan)) {
      res.status(400).json({ error: 'Scheduled renewals are only for upgrades. For downgrades use the Schedule Downgrade option.' });
      return;
    }

    let activeExpiresAt = hospital.planExpiresAt;
    if (!activeExpiresAt) {
      const start = hospital.approvedAt || hospital.submittedAt;
      if (start) {
        activeExpiresAt = new Date(start);
        activeExpiresAt.setDate(activeExpiresAt.getDate() + BILLING_CYCLE_DAYS);
      }
    }

    const daysRemaining = daysRemainingInCycle(activeExpiresAt);
    if (daysRemaining <= 0) {
      res.status(400).json({ error: 'Your plan has already expired. Use Upgrade Now to renew immediately.' });
      return;
    }

    const amount = PLAN_PRICES[newPlan as keyof typeof PLAN_PRICES] ?? 0;
    if (amount <= 0) {
      res.status(400).json({ error: 'Target plan is free — no payment required. Use the standard plan change option.' });
      return;
    }

    if (hospital.pendingPlan === newPlan && hospital.pendingPlanPaymentRef) {
      res.status(400).json({ error: `An upgrade to ${newPlan} is already scheduled and paid for.` });
      return;
    }

    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `sched_${hospital.id.substring(0, 10)}_${Date.now()}`,
    });

    const order = await prisma.paymentOrder.create({
      data: {
        hospitalId:     hospital.id,
        amount,
        currency:       'INR',
        razorpayOrderId: rzpOrder.id,
        status:         'CREATED',
        planRequested:  `scheduled_upgrade:${currentPlan}→${newPlan}`,
      },
    });

    res.json({ orderId: order.razorpayOrderId, amount: order.amount, currency: order.currency, keyId: razorpayKeyId });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to create scheduled upgrade order' });
  }
});

// ─── POST /api/payment/scheduled-upgrade-verify ───────────────────────────────
// Verifies Razorpay signature for a scheduled upgrade order.
// Sets pendingPlan + pendingPlanPaymentRef on hospital so the nightly cron applies it at renewal.
router.post('/scheduled-upgrade-verify', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, newPlan } =
    req.body as {
      razorpay_order_id:  string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      newPlan: string;
    };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !newPlan) {
    res.status(400).json({ error: 'Missing payment or plan details' });
    return;
  }
  if (!isValidPlan(newPlan)) {
    res.status(400).json({ error: 'Invalid target plan' });
    return;
  }

  try {
    const order = await prisma.paymentOrder.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
      include: { hospital: true },
    });

    if (!order || !order.planRequested.startsWith('scheduled_upgrade:')) {
      res.status(400).json({ error: 'Invalid or unrecognised scheduled upgrade order' });
      return;
    }
    if (order.hospitalId !== req.user!.hospitalId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Idempotent retry
    if (order.status === 'PAID') {
      res.json({ success: true, pendingPlan: newPlan, pendingPlanAt: order.hospital.pendingPlanAt?.toISOString() ?? null });
      return;
    }
    if (order.status !== 'CREATED') {
      res.status(400).json({ error: 'Invalid or already processed order' });
      return;
    }

    // Verify Razorpay signature
    const generatedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const expected = Buffer.from(generatedSignature);
    const received = Buffer.from(String(razorpay_signature));
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      await prisma.paymentOrder.update({ where: { id: order.id }, data: { status: 'FAILED' } });
      res.status(400).json({ error: 'Invalid payment signature' });
      return;
    }

    const currentPlan = order.hospital.onboardingPlan;
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.paymentOrder.update({ where: { id: order.id }, data: { status: 'PAID' } });
      await tx.hospital.update({
        where: { id: order.hospital.id },
        data: {
          pendingPlan:           newPlan,
          pendingPlanAt:         now,
          pendingPlanPaymentRef: razorpay_payment_id,
        },
      });
      await tx.planChangeLog.create({
        data: {
          hospitalId:    order.hospital.id,
          fromPlan:      currentPlan,
          toPlan:        newPlan,
          changeType:    'scheduled_upgrade',
          amountPaid:    order.amount,
          effectiveAt:   order.hospital.planExpiresAt ?? now,
          paymentStatus: 'Paid',
          paymentRef:    razorpay_payment_id,
          note: `Scheduled upgrade paid. ${currentPlan} → ${newPlan} will activate at renewal (${order.hospital.planExpiresAt?.toISOString().slice(0, 10) ?? 'next cycle'}). Cost: ₹${order.amount}.`,
        },
      });
    });

    // Notify recruiters
    const recruiters = await prisma.user.findMany({
      where: { hospitalId: order.hospital.id, role: 'RECRUITER' },
    });
    if (recruiters.length > 0) {
      await prisma.inAppNotification.createMany({
        data: recruiters.map((u) => ({
          userId:  u.id,
          title:   `Upgrade to ${newPlan} Scheduled`,
          message: `Your upgrade from ${currentPlan} to ${newPlan} has been paid and is scheduled for your next renewal on ${order.hospital.planExpiresAt?.toISOString().slice(0, 10) ?? 'expiry date'}.`,
          link:    '/settings',
        })),
      });
    }

    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
        entityId:   order.hospital.id,
        action:     'plan_scheduled_upgrade_paid',
        actorId:    req.user!.id,
        actorRole:  'RECRUITER',
        meta:       JSON.stringify({ from: currentPlan, to: newPlan, amountPaid: order.amount, activatesAt: order.hospital.planExpiresAt }),
      },
    });

    res.json({ success: true, pendingPlan: newPlan, pendingPlanAt: now.toISOString() });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to verify scheduled upgrade payment' });
  }
});

export default router;
