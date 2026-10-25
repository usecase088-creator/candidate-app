/**
 * webhookRoutes.ts
 *
 * Razorpay server-side webhook — fallback for cases where the client-side
 * /verify or /verify-payment call never reaches the server (tab closed, network
 * drop, app crash after payment).
 *
 * CRITICAL: This route MUST be mounted BEFORE express.json() so that
 * req.body is a raw Buffer — Razorpay signs the raw bytes, not the parsed JSON.
 *
 * Env required:
 *   RAZORPAY_WEBHOOK_SECRET  — set in Render + Razorpay dashboard
 *
 * Razorpay will retry on any non-2xx response (exponential back-off, 24 h).
 * We always return 200 after logging, even on unhandled events, to stop retries.
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { addDays, BILLING_CYCLE_DAYS } from '../lib/planBilling';
import { getRecruiterLimit } from '../config/plans';
import { closePlanExpiredActiveJobs } from '../lib/hospitalSuspend';

const router = Router();

// ─── POST /api/webhooks/razorpay ──────────────────────────────────────────────
// express.raw() is applied per-route here so the rest of the app continues
// to receive parsed JSON normally via the global express.json() middleware.
router.post(
  '/razorpay',
  // We parse this individually below; global express.json() must NOT run first.
  (req, res, next) => {
    // If somehow the body is already parsed (shouldn't happen when mounted before
    // express.json) fall through gracefully.
    if (Buffer.isBuffer(req.body)) return next();
    // Otherwise collect the raw bytes ourselves.
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      req.body = Buffer.concat(chunks);
      next();
    });
  },
  async (req: Request, res: Response) => {
    // ── 1. Validate secret is configured ─────────────────────────────────────
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.warn('[Webhook] RAZORPAY_WEBHOOK_SECRET not set — event ignored');
      // Return 200 so Razorpay does not keep retrying against an unconfigured server.
      res.json({ received: true });
      return;
    }

    // ── 2. Verify Razorpay signature ─────────────────────────────────────────
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    if (!signature) {
      res.status(400).json({ error: 'Missing X-Razorpay-Signature header' });
      return;
    }

    const rawBody = req.body as Buffer;

    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    let sigValid = false;
    try {
      const expBuf = Buffer.from(expectedSig, 'utf8');
      const recBuf = Buffer.from(signature, 'utf8');
      sigValid = expBuf.length === recBuf.length && crypto.timingSafeEqual(expBuf, recBuf);
    } catch {
      sigValid = false;
    }

    if (!sigValid) {
      logger.warn('[Webhook] Invalid signature — potential spoofing attempt');
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    // ── 3. Parse event ────────────────────────────────────────────────────────
    let event: any;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      res.status(400).json({ error: 'Malformed JSON payload' });
      return;
    }

    const eventType: string = event?.event ?? '';
    logger.info(`[Webhook] Received event: ${eventType}`);

    // ── 4. Handle relevant events ─────────────────────────────────────────────
    // We handle payment.captured and order.paid — both indicate a successful payment.
    // payment.failed is logged only (the client-side flow marks FAILED already).
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      try {
        await handlePaymentSuccess(event, eventType);
      } catch (err) {
        logger.error('[Webhook] Unhandled error in handlePaymentSuccess', err);
        // Still 200 — we logged the error; retrying won't help a programming bug.
      }
    } else if (eventType === 'payment.failed') {
      const paymentId = event?.payload?.payment?.entity?.id ?? 'unknown';
      const orderId   = event?.payload?.payment?.entity?.order_id ?? 'unknown';
      logger.warn(`[Webhook] payment.failed — orderId: ${orderId}, paymentId: ${paymentId}`);
    } else {
      logger.info(`[Webhook] Unhandled event type: ${eventType} — ignored`);
    }

    // Always 200 so Razorpay stops retrying.
    res.json({ received: true });
  }
);

// ─── Helper: process a successful payment event ───────────────────────────────

async function handlePaymentSuccess(event: any, eventType: string): Promise<void> {
  // Extract identifiers from the Razorpay event shape.
  // Both payment.captured and order.paid carry the order_id.
  const paymentEntity = event?.payload?.payment?.entity;
  const orderEntity   = event?.payload?.order?.entity;

  const razorpayOrderId: string | undefined =
    paymentEntity?.order_id ?? orderEntity?.id;
  const razorpayPaymentId: string | undefined =
    paymentEntity?.id;

  if (!razorpayOrderId) {
    logger.warn('[Webhook] No order_id in event payload — cannot process');
    return;
  }

  // ── Fetch our PaymentOrder ─────────────────────────────────────────────────
  const order = await prisma.paymentOrder.findUnique({
    where: { razorpayOrderId },
    include: { hospital: true },
  });

  if (!order) {
    logger.warn(`[Webhook] No PaymentOrder found for razorpayOrderId: ${razorpayOrderId}`);
    return;
  }

  // ── Idempotency guard ──────────────────────────────────────────────────────
  if (order.status === 'PAID') {
    logger.info(`[Webhook] Order ${razorpayOrderId} already PAID — skipping (idempotent)`);
    return;
  }

  // ── Determine payment flow: onboarding vs plan-upgrade ────────────────────
  const changeType = order.hospital.onboardingStatus !== 'Approved'
    ? 'onboarding_activation'
    : 'webhook_upgrade';

  const newPlan         = order.planRequested;
  const newExpiresAt    = addDays(BILLING_CYCLE_DAYS);
  const newMaxRecruiters = getRecruiterLimit(newPlan);

  // For onboarding flow: move status from PendingPayment → Pending (admin reviews next).
  // For upgrade flow: immediately activate the new plan.
  const hospitalUpdate =
    changeType === 'onboarding_activation'
      ? { onboardingStatus: 'Pending' as const }
      : {
          onboardingPlan:  newPlan,
          planExpiresAt:   newExpiresAt,
          maxRecruiters:   newMaxRecruiters,
          pendingPlan:     null,
          pendingPlanAt:   null,
        };

  // ── Atomic transaction: flip order to PAID + update hospital ─────────────
  await prisma.$transaction(async (tx) => {
    // Optimistic lock: only flip CREATED → PAID. If another process (client
    // verify) already flipped it, count === 0 and we bail out safely.
    const flip = await tx.paymentOrder.updateMany({
      where: { id: order.id, status: 'CREATED' },
      data:  { status: 'PAID' },
    });

    if (flip.count === 0) {
      // Race: client /verify already ran. Nothing to do.
      logger.info(`[Webhook] Order ${razorpayOrderId} was flipped by client verify — skipping`);
      return;
    }

    await tx.hospital.update({
      where: { id: order.hospital.id },
      data:  hospitalUpdate,
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
        hospitalId:     order.hospital.id,
        fromPlan:       order.hospital.onboardingPlan,
        toPlan:         newPlan,
        changeType,
        amountPaid:     order.amount,
        effectiveAt:    new Date(),
        paymentStatus:  'Paid',
        paymentRef:     razorpayPaymentId ?? razorpayOrderId,
        note: `Webhook fallback (${eventType}). Plan: ${newPlan}. Order: ${razorpayOrderId}.`,
      },
    });
  });

  await closePlanExpiredActiveJobs(order.hospital.id);

  logger.info(
    `[Webhook] Successfully processed ${eventType} — ` +
    `hospital: ${order.hospital.id}, plan: ${newPlan}, changeType: ${changeType}`
  );
}

export default router;
