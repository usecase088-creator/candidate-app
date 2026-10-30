import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import logger from '../lib/logger';
import prisma from '../lib/prisma';
import { deleteCandidateAccount, processCleanup } from '../lib/accountDeletion';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Password guesses are limited per account, not per IP (many phones share one mobile-network IP).
export const deleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => String((req as AuthRequest).user?.id ?? 'anonymous'),
  validate: false,
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/account/delete  { password }
// POST rather than DELETE: a password in a DELETE body is dropped by some proxies. A wrong password answers 400, not
// 401, because the app treats 401 as "signed out".
router.post('/delete', requireAuth, requireRole('CANDIDATE'), deleteLimiter, async (req: AuthRequest, res: Response) => {
  const password = (req.body ?? {}).password;
  if (typeof password !== 'string' || password.length === 0) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { passwordHash: true } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(400).json({ error: 'Incorrect password' });
      return;
    }
    await deleteCandidateAccount(req.user!.id);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to delete account' });
    return;
  }
  // The account is already gone; the files are cleaned up now, or by the next sweep if Cloudinary is unreachable.
  await processCleanup();
  res.json({ success: true });
});

export default router;
