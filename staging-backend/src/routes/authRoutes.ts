import logger from '../lib/logger';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getRecruiterLimit, ensureUsageReset, getHospitalValidity } from '../lib/helpers';
import { BILLING_CYCLE_DAYS, DEFAULT_PLAN_TIER } from '../config/plans';
import { sendOTP, verifyOTP, smartResendOTP } from '../lib/otp';
import { generateResetToken, validateResetToken, deleteResetToken } from '../lib/resetTokenStore';
import { generateSignupToken, validateSignupToken, deleteSignupToken } from '../lib/signupTokenStore';

const router = Router();
const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error("FATAL: JWT_SECRET environment variable is not set.");

type AuthRole = 'RECRUITER' | 'CANDIDATE';

function isAuthRole(role: unknown): role is AuthRole {
  return role === 'RECRUITER' || role === 'CANDIDATE';
}

async function findUserByMobile(mobile: string, role: string) {
  const normalized = mobile.replace(/\s+/g, '').replace(/^\+91/, '');
  return await prisma.user.findFirst({
    where: {
      role,
      OR: [
        { mobile: normalized },
        { mobile: `+91${normalized}` },
        { mobile: `+91 ${normalized}` },
        { mobile: `${normalized.slice(0, 5)} ${normalized.slice(5)}` },
        { mobile: `+91 ${normalized.slice(0, 5)} ${normalized.slice(5)}` },
        { mobile }
      ]
    }
  });
}

// POST /api/auth/signup/send-otp
router.post('/signup/send-otp', async (req: Request, res: Response) => {
  try {
    const { mobile, role } = req.body;
    if (!mobile || !role) {
      res.status(400).json({ error: 'mobile and role are required' });
      return;
    }
    if (!isAuthRole(role)) {
      res.status(400).json({ error: 'role must be RECRUITER or CANDIDATE' });
      return;
    }

    const existingMobile = await findUserByMobile(String(mobile), role);
    if (!existingMobile?.mobile) {
      await sendOTP(String(mobile), { templateType: 'verification' });
    }
    res.json({ message: 'If this number is eligible for signup, an OTP has been sent.' });
  } catch (err: any) {
    logger.error(`[auth/signup/send-otp] ${err.message}`);
    const status = err.statusCode || 500;
    res.status(status).json({ error: status >= 500 ? 'Failed to send OTP. Please try again.' : err.message });
  }
});

// POST /api/auth/signup/verify-otp
router.post('/signup/verify-otp', async (req: Request, res: Response) => {
  try {
    const { mobile, otp, role } = req.body;
    if (!mobile || !otp || !role) {
      res.status(400).json({ error: 'mobile, otp, and role are required' });
      return;
    }
    if (!isAuthRole(role)) {
      res.status(400).json({ error: 'role must be RECRUITER or CANDIDATE' });
      return;
    }

    const existingMobile = await findUserByMobile(String(mobile), role);
    if (existingMobile?.mobile) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    await verifyOTP(String(mobile), String(otp));
    const signup_token = await generateSignupToken(String(mobile), role);
    res.json({ message: 'OTP verified', signup_token });
  } catch (err: any) {
    const status = err.statusCode === 404 ? 400 : (err.statusCode || 400);
    res.status(status).json({ error: 'Invalid or expired OTP' });
  }
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name, fullName, username, mobile, role, inviteCode, signup_token } = req.body;

  if (!email || !password || !name || !mobile || !role || !signup_token) {
    res.status(400).json({ error: 'email, password, name, mobile, role, and signup_token are required' });
    return;
  }
  if (!isAuthRole(role)) {
    res.status(400).json({ error: 'role must be CANDIDATE or RECRUITER' });
    return;
  }
  if (
    email.length > 255 || 
    password.length > 128 || 
    name.length > 100 || 
    (fullName && fullName.length > 100) || 
    (username && username.length > 50) || 
    (mobile && mobile.length > 20)
  ) {
    res.status(400).json({ error: 'Input fields exceed maximum allowed length' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long' });
    return;
  }
  if (!/[A-Z]/.test(password)) {
    res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    return;
  }
  if (!/[a-z]/.test(password)) {
    res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    return;
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    res.status(400).json({ error: 'Password must contain at least one special character' });
    return;
  }

  try {
    const validSignupToken = await validateSignupToken(String(signup_token), String(mobile), role);
    if (!validSignupToken) {
      res.status(400).json({ error: 'Mobile verification is required before registration' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email is already registered' });
      return;
    }

    if (mobile) {
      const existingMobile = await prisma.user.findFirst({ where: { mobile, role } });
      if (existingMobile) {
        res.status(409).json({ error: 'Mobile number is already registered for this role' });
        return;
      }
    }

    // Username uniqueness will be enforced by Prisma's @@unique([hospitalId, username]) during create.

    const passwordHash = await bcrypt.hash(password, 10);
    let hospitalId: string | undefined = undefined;
    let candidateId: string | undefined = undefined;

    if (role === 'RECRUITER') {
      // ── Invite-code-based signup ──────────────────────────────────────────
      if (!inviteCode) {
        res.status(400).json({ error: 'An invite code is required to sign up as a recruiter.' });
        return;
      }

      const hospital = await prisma.hospital.findUnique({
        where: { inviteCode: String(inviteCode).toUpperCase() },
      });

      if (!hospital) {
        res.status(400).json({ error: 'Invalid invite code. Please check the code provided by your hospital.' });
        return;
      }

      if (hospital.onboardingStatus !== 'Approved') {
        res.status(403).json({ error: 'This hospital has not been approved yet. Please wait for admin approval.' });
        return;
      }

      // Enforce plan-based recruiter limit (excluding soft-deleted and plan-suspended)
      const recruiterCount = await prisma.user.count({
        where: { hospitalId: hospital.id, role: 'RECRUITER', deletedAt: null, planSuspendedAt: null }
      });
      const limit = getRecruiterLimit(hospital.onboardingPlan);

      if (recruiterCount >= limit) {
        res.status(403).json({
          error: `This hospital has reached the maximum number of recruiters (${limit}) for the ${hospital.onboardingPlan} plan.`,
        });
        return;
      }

      hospitalId = hospital.id;
    }

    const user = await prisma.user.create({
      data: { email, passwordHash, name, fullName, username, mobile, role, hospitalId }
    });

    if (role === 'CANDIDATE') {
      const candidate = await prisma.candidate.create({
        data: {
          name,
          email,
          userId: user.id,
          initials: name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
        }
      });
      candidateId = candidate.id;
    }

    await deleteSignupToken(String(signup_token));

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, hospitalId, candidateId, tokenVersion: user.tokenVersion },
      SECRET,
      { expiresIn: '15d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, hospitalId, candidateId }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Block suspended or soft-deleted users from logging in
    if (user.isSuspended) {
      res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
      return;
    }
    if (user.deletedAt) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    let candidateId: string | null = null;
    if (user.role === 'CANDIDATE') {
      const candidate = await prisma.candidate.findUnique({ where: { userId: user.id } });
      candidateId = candidate?.id ?? null;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, hospitalId: user.hospitalId, candidateId, tokenVersion: user.tokenVersion },
      SECRET,
      { expiresIn: '15d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, hospitalId: user.hospitalId, candidateId }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let user = await prisma.user.findUnique({ 
      where: { id: req.user!.id },
      include: { hospital: true }
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    const finalUser = user.role === 'RECRUITER' ? await ensureUsageReset(prisma, user) : user;
    
    // Calculate dynamic validity
    let jobValidityDays = BILLING_CYCLE_DAYS;
    let isLocked = false;
    if (finalUser.role === 'RECRUITER' && finalUser.hospital) {
      const validity = getHospitalValidity(finalUser.hospital);
      jobValidityDays = validity.daysRemaining;
      isLocked = validity.isLocked;
    }
    
    res.json({
      user: {
        id: finalUser.id,
        email: finalUser.email,
        name: finalUser.name,
        role: finalUser.role,
        hospitalId: finalUser.hospitalId,
        candidateId: req.user!.candidateId,
        jobsPostedThisMonth: finalUser.jobsPostedThisMonth,
        premiumSearchesThisMonth: finalUser.premiumSearchesThisMonth,
        plan: finalUser.hospital?.onboardingPlan || DEFAULT_PLAN_TIER,
        jobValidityDays,
        isLocked,
        isPlanSuspended: !!finalUser.planSuspendedAt,
        // Notification preferences
        notifOnApply: finalUser.notifOnApply ?? true,
        notifWeekly: finalUser.notifWeekly ?? false,
        notifHighMatch: finalUser.notifHighMatch ?? true,
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PATCH /api/auth/me
router.patch('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name, notifOnApply, notifWeekly, notifHighMatch } = req.body;

  // At least one updatable field must be present
  const hasName = name !== undefined;
  const hasNotifUpdate = notifOnApply !== undefined || notifWeekly !== undefined || notifHighMatch !== undefined;

  if (!hasName && !hasNotifUpdate) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }
  if (hasName && (typeof name !== 'string' || name.trim().length === 0)) {
    res.status(400).json({ error: 'Valid name is required' });
    return;
  }

  try {
    const updateData: Record<string, unknown> = {};
    if (hasName) updateData.name = (name as string).trim();
    if (notifOnApply !== undefined) updateData.notifOnApply = Boolean(notifOnApply);
    if (notifWeekly !== undefined) updateData.notifWeekly = Boolean(notifWeekly);
    if (notifHighMatch !== undefined) updateData.notifHighMatch = Boolean(notifHighMatch);

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
    });

    // Generate a new token with latest user data (preserve tokenVersion)
    const token = jwt.sign(
      {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        hospitalId: updated.hospitalId,
        candidateId: req.user!.candidateId,
        tokenVersion: updated.tokenVersion
      },
      SECRET,
      { expiresIn: '15d' }
    );

    res.json({
      token,
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        hospitalId: updated.hospitalId,
        candidateId: req.user!.candidateId,
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// ─── Password Reset Flow (OTP) ────────────────────────────────────────────────

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { mobile, role } = req.body;
    if (!mobile || !role) {
      res.status(400).json({ error: 'mobile and role are required' });
      return;
    }
    if (role !== 'RECRUITER' && role !== 'CANDIDATE') {
      res.status(400).json({ error: 'role must be RECRUITER or CANDIDATE' });
      return;
    }

    const user = await findUserByMobile(mobile, role);
    if (user?.mobile) {
      await sendOTP(user.mobile, { templateType: 'reset' });
    }
    res.json({ message: 'If an account exists for this number, an OTP has been sent.' });
  } catch (err: any) {
    logger.error(`[auth/forgot-password] ${err.message}`);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { mobile, otp, role } = req.body;
    if (!mobile || !otp || !role) {
      res.status(400).json({ error: 'mobile, otp, and role are required' });
      return;
    }
    if (role !== 'RECRUITER' && role !== 'CANDIDATE') {
      res.status(400).json({ error: 'role must be RECRUITER or CANDIDATE' });
      return;
    }

    const user = await findUserByMobile(mobile, role);
    if (!user || !user.mobile) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    await verifyOTP(user.mobile, otp);

    const reset_token = await generateResetToken(user.mobile, role);

    // R12: mask the email so the user can verify which account is being reset
    let maskedEmail = user.email;
    if (maskedEmail.includes('@')) {
      const [local, domain] = maskedEmail.split('@');
      if (local.length > 2) {
        maskedEmail = `${local[0]}***${local[local.length - 1]}@${domain}`;
      } else {
        maskedEmail = `${local}***@${domain}`;
      }
    }

    res.json({ message: 'OTP verified', reset_token, maskedEmail });
  } catch (err: any) {
    const status = err.statusCode === 404 ? 400 : (err.statusCode || 400);
    res.status(status).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { reset_token, new_password, role } = req.body;
    if (!reset_token || !new_password || !role) {
      res.status(400).json({ error: 'reset_token, new_password, and role are required' });
      return;
    }
    if (new_password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }
    if (!/[A-Z]/.test(new_password)) {
      res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
      return;
    }
    if (!/[a-z]/.test(new_password)) {
      res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
      return;
    }
    if (!/[^A-Za-z0-9]/.test(new_password)) {
      res.status(400).json({ error: 'Password must contain at least one special character' });
      return;
    }
    if (role !== 'RECRUITER' && role !== 'CANDIDATE') {
      res.status(400).json({ error: 'role must be RECRUITER or CANDIDATE' });
      return;
    }

    const mobile = await validateResetToken(reset_token, role);
    if (!mobile) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    const passwordHash = await bcrypt.hash(new_password, 10);
    await prisma.user.updateMany({
      where: { mobile, role },
      data: { 
        passwordHash,
        tokenVersion: { increment: 1 } 
      }
    });
    
    await deleteResetToken(reset_token);

    const user = await findUserByMobile(mobile, role);
    if (user) {
      logger.info(`[auth/reset-password] accountId=${user.id} role=${role} method=phone timestamp=${new Date().toISOString()}`);
    }

    res.json({ message: 'Password reset successfully' });
  } catch (err: any) {
    logger.error(`[auth/reset-password] ${err.message}`);
    res.status(500).json({ error: 'Password reset failed. Please try again.' });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req: Request, res: Response) => {
  try {
    const { mobile, role } = req.body;
    if (!mobile || !role) {
      res.status(400).json({ error: 'mobile and role are required' });
      return;
    }

    const user = await findUserByMobile(mobile, role);
    if (!user || !user.mobile) {
      // Fake success
      res.json({ message: 'OTP resent successfully' });
      return;
    }

    await smartResendOTP(user.mobile, { templateType: 'reset' });
    res.json({ message: 'OTP resent successfully' });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

export default router;
