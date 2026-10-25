import logger from '../lib/logger';
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getRecruiterLimit, isValidPlan, PLAN_PRICES, type PlanTier } from '../config/plans';
import { sendOTP } from '../lib/otp';
import { notifyAdminHospitalOnboarding } from '../lib/notifyAdmin';
import Razorpay from 'razorpay';
import crypto from 'crypto';

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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/hospitals  (Public — no auth required)
// Hospital submits their onboarding application. Admin will review it.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/hospitals', async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,        // Hospital contact / recruitment email
      phone,
      plan,         // 'Basic' | 'Pro' | 'Premium'
      submittedBy,  // Contact person name
      type,         // Hospital type
      city,
      state,
      address,
      founded,
      about,
      website,
      beds,
      registrationNumber,
      brandName,
      registrationAuthority,
      nabhStatus,
      nablStatus,
      gstNumber,
      panNumber,
      ownershipType,
      contactDesignation,
      contactWhatsapp,
      contactAlternatePhone,
      district,
      pinCode,
      billingName,
      billingGstNumber,
      billingAddress,
      billingEmail,
      billingPhone,
      icuBeds,
      numberOfDoctors,
      numberOfEmployees,
      averageMonthlyHiring,
      preferredHiringStates,
      emergencyHiringRequirement,
      internshipHiring,
      campusRecruitment,
      logoUrl,
      logoCloudinaryId
    } = req.body;

    if (!name || !email || !plan || !type || !city || !state || !address || !phone) {
      res.status(400).json({ error: 'Hospital name, type, location (city, state, address), contact email, phone, and plan are required.' });
      return;
    }

    if (!logoUrl) {
      res.status(400).json({ error: 'Hospital logo is mandatory. Please upload a JPG or PNG logo under 5MB.' });
      return;
    }

    if (!registrationNumber || !registrationAuthority || !ownershipType) {
      res.status(400).json({
        error: 'Registration number, registration authority, and ownership type are required.',
      });
      return;
    }

    const phoneDigits = String(phone).replace(/^\+91/, '').replace(/\s+/g, '');
    if (!/^\d{10}$/.test(phoneDigits)) {
      res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
      return;
    }

    if (!isValidPlan(String(plan))) {
      res.status(400).json({ error: 'Plan must be Basic, Pro, or Premium.' });
      return;
    }

    // Prevent duplicate submissions by hospital name
    const existing = await prisma.hospital.findFirst({ where: { name: String(name) } });
    if (existing) {
      if (existing.onboardingStatus === 'Rejected') {
        res.status(409).json({
          error: 'A previous application for this hospital was rejected. Please contact support.',
        });
      } else {
        res.status(409).json({
          error: 'A hospital with this name is already registered or pending approval.',
        });
      }
      return;
    }

    const maxRecruiters = getRecruiterLimit(plan);

    const hospital = await prisma.hospital.create({
      data: {
        name:               String(name),
        submittedEmail:     String(email),
        email:              String(email),
        submittedPhone:     phone             ? String(phone)              : null,
        phone:              phone             ? String(phone)              : null,
        submittedBy:        submittedBy       ? String(submittedBy)        : null,
        onboardingPlan:     String(plan),
        maxRecruiters,
        onboardingStatus:   (plan === 'Pro' || plan === 'Premium') ? 'PendingPayment' : 'Pending',
        submittedAt:        new Date(),
        type:               type              ? String(type)               : null,
        city:               city              ? String(city)               : null,
        state:              state             ? String(state)              : null,
        address:            address           ? String(address)            : null,
        website:            website           ? String(website)            : null,
        founded:            founded           ? Number(founded)            : null,
        about:              about             ? String(about)              : null,
        beds:               beds              ? Number(beds)               : null,
        registrationNumber: registrationNumber ? String(registrationNumber) : null,
        brandName:          brandName         ? String(brandName)          : null,
        registrationAuthority: registrationAuthority ? String(registrationAuthority) : null,
        nabhStatus:         nabhStatus        ? String(nabhStatus)         : null,
        nablStatus:         nablStatus        ? String(nablStatus)         : null,
        gstNumber:          gstNumber         ? String(gstNumber)          : null,
        panNumber:          panNumber         ? String(panNumber)          : null,
        ownershipType:      ownershipType     ? String(ownershipType)      : null,
        contactDesignation: contactDesignation ? String(contactDesignation) : null,
        contactWhatsapp:    contactWhatsapp   ? String(contactWhatsapp)    : null,
        contactAlternatePhone: contactAlternatePhone ? String(contactAlternatePhone) : null,
        district:           district          ? String(district)           : null,
        pinCode:            pinCode           ? String(pinCode)            : null,
        billingName:        billingName       ? String(billingName)        : null,
        billingGstNumber:   billingGstNumber  ? String(billingGstNumber)   : null,
        billingAddress:     billingAddress    ? String(billingAddress)     : null,
        billingEmail:       billingEmail      ? String(billingEmail)       : null,
        billingPhone:       billingPhone      ? String(billingPhone)       : null,
        icuBeds:            icuBeds           ? Number(icuBeds)            : null,
        numberOfDoctors:    numberOfDoctors   ? Number(numberOfDoctors)    : null,
        numberOfEmployees:  numberOfEmployees ? Number(numberOfEmployees)  : null,
        averageMonthlyHiring: averageMonthlyHiring ? Number(averageMonthlyHiring) : null,
        preferredHiringStates: preferredHiringStates ? String(preferredHiringStates) : null,
        emergencyHiringRequirement: emergencyHiringRequirement === true,
        internshipHiring:   internshipHiring === true,
        campusRecruitment:  campusRecruitment === true,
        logoUrl:            logoUrl           ? String(logoUrl)            : null,
        logoCloudinaryId:   logoCloudinaryId  ? String(logoCloudinaryId)   : null,
        specialties:        '[]',
      }
    });

    void notifyAdminHospitalOnboarding(hospital);

    let otpSent = false;
    if (phone) {
      try {
        await sendOTP(String(phone));
        otpSent = true;
      } catch (err: any) {
        logger.error(`[onboarding/hospitals] OTP send failed for ${phone}: ${err.message}`);
        // Keep the application in mobile-verification flow so the user can resend later.
      }
    }

    res.status(201).json({
      message: phone
        ? (otpSent
          ? 'Application submitted. Please verify your mobile number to complete submission.'
          : 'Application submitted, but OTP could not be sent. Please use resend OTP.')
        : 'Onboarding application submitted successfully. You will hear from us within 48 hours.',
      applicationId: hospital.id,
      requiresVerification: Boolean(phone),
      otpSent,
      onboardingPlan: hospital.onboardingPlan,
      onboardingStatus: hospital.onboardingStatus,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to submit onboarding request.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/onboarding/verify-code/:code  (Public — no auth required)
// Recruiters enter their hospital invite code before signing up.
// Returns basic hospital info + plan so the UI can confirm before proceeding.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/verify-code/:code', async (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;

    if (!code || code.length !== 12) {
      res.status(400).json({ error: 'Invite code must be exactly 12 characters.' });
      return;
    }

    const hospital = await prisma.hospital.findUnique({
      where: { inviteCode: code.toUpperCase() },
      include: {
        _count: { select: { users: true } },
      }
    });

    if (!hospital) {
      res.status(404).json({ error: 'Invalid invite code. Please check the code and try again.' });
      return;
    }

    if (hospital.onboardingStatus !== 'Approved') {
      res.status(403).json({ error: 'This hospital has not been approved yet.' });
      return;
    }

    // Count only active RECRUITER users for limit check (exclude deleted and plan-suspended)
    const recruiterCount = await prisma.user.count({
      where: { hospitalId: hospital.id, role: 'RECRUITER', deletedAt: null, planSuspendedAt: null }
    });

    const limit = getRecruiterLimit(hospital.onboardingPlan);
    const spotsLeft = limit - recruiterCount;

    if (spotsLeft <= 0) {
      res.status(403).json({
        error: `This hospital has reached its maximum recruiter limit (${limit}) for the ${hospital.onboardingPlan} plan.`,
      });
      return;
    }

    // Return only safe, non-sensitive fields
    res.json({
      hospitalId:   hospital.id,
      hospitalName: hospital.name,
      plan:         hospital.onboardingPlan,
      city:         hospital.city,
      state:        hospital.state,
      type:         hospital.type,
      spotsLeft,
      limit,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to verify invite code.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/create-payment-order  (Public — no auth required)
// Creates a Razorpay order for paid plan during onboarding.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create-payment-order', async (req: Request, res: Response) => {
  const { applicationId } = req.body;
  if (!applicationId) {
    res.status(400).json({ error: 'applicationId is required' });
    return;
  }
  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: String(applicationId) },
    });
    if (!hospital) {
      res.status(404).json({ error: 'Hospital application not found' });
      return;
    }
    if (hospital.onboardingStatus !== 'PendingPayment') {
      res.status(400).json({ error: 'This application is not pending payment.' });
      return;
    }
    const plan = hospital.onboardingPlan;
    const amount = PLAN_PRICES[plan as PlanTier] ?? 0;
    if (amount <= 0) {
      res.status(400).json({ error: 'Selected plan does not require payment.' });
      return;
    }

    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // amount in paisa
      currency: 'INR',
      receipt: `receipt_onb_${hospital.id.substring(0, 10)}_${Date.now()}`
    });

    const order = await prisma.paymentOrder.create({
      data: {
        hospitalId: hospital.id,
        amount,
        currency: 'INR',
        razorpayOrderId: rzpOrder.id,
        status: 'CREATED',
        planRequested: plan
      }
    });

    res.json({ orderId: order.razorpayOrderId, amount: order.amount, currency: order.currency, keyId: razorpayKeyId });
  } catch (err: any) {
    logger.error('[onboarding/create-payment-order]', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/verify-payment  (Public — no auth required)
// Verifies Razorpay signature for onboarding payment and updates hospital status.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-payment', async (req: Request, res: Response) => {
  const { applicationId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!applicationId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: 'Missing payment details' });
    return;
  }

  try {
    const order = await prisma.paymentOrder.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
      include: { hospital: true },
    });

    if (!order || order.hospitalId !== applicationId) {
      res.status(400).json({ error: 'Invalid order or application mismatch' });
      return;
    }

    const generatedSignature = crypto
      .createHmac('sha256', razorpayKeySecret!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

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

    if (order.status === 'PAID') {
      res.json({ success: true, plan: order.hospital.onboardingPlan });
      return;
    }

    // Optimistic lock: only flip CREATED → PAID.
    // If a concurrent request (or webhook) already flipped it, count===0 → skip.
    let alreadyProcessed = false;
    await prisma.$transaction(async (tx) => {
      const flip = await tx.paymentOrder.updateMany({
        where: { id: order.id, status: 'CREATED' },
        data:  { status: 'PAID' },
      });

      if (flip.count === 0) {
        alreadyProcessed = true;
        return;
      }

      await tx.hospital.update({
        where: { id: order.hospital.id },
        data: { onboardingStatus: 'Pending' },
      });

      await tx.planChangeLog.create({
        data: {
          hospitalId:    order.hospital.id,
          fromPlan:      'None',
          toPlan:        order.planRequested,
          changeType:    'onboarding_activation',
          amountPaid:    order.amount,
          effectiveAt:   new Date(),
          paymentStatus: 'Paid',
          paymentRef:    razorpay_payment_id,
          note:          `Onboarding subscription payment. Plan: ${order.planRequested}.`,
        },
      });
    });

    res.json({ success: true, plan: order.planRequested, alreadyProcessed });
  } catch (err: any) {
    logger.error('[onboarding/verify-payment]', err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

export default router;
