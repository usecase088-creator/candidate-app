import { Router, Response } from 'express';
import logger from '../lib/logger';
import prisma from '../lib/prisma';
import { isExpoPushToken } from '../lib/pushNotifications';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
const PLATFORMS = new Set(['android', 'ios']);

// POST /api/push-tokens  { token, platform }  (the candidate app registers its phone)
router.post('/', requireAuth, requireRole('CANDIDATE'), async (req: AuthRequest, res: Response) => {
  const { token, platform } = (req.body ?? {}) as { token?: unknown; platform?: unknown };
  if (!isExpoPushToken(token)) {
    res.status(400).json({ error: 'Invalid push token' });
    return;
  }
  if (typeof platform !== 'string' || !PLATFORMS.has(platform)) {
    res.status(400).json({ error: 'Invalid platform' });
    return;
  }
  try {
    // One row per phone: a phone that signs in as someone else moves to that person.
    await prisma.pushToken.upsert({
      where: { token },
      create: { token, platform, userId: req.user!.id },
      update: { platform, userId: req.user!.id, lastSeenAt: new Date() },
    });
    res.json({ success: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to save push token' });
  }
});

// DELETE /api/push-tokens  { token }  (sign out: this phone stops getting this user's pushes)
router.delete('/', requireAuth, requireRole('CANDIDATE'), async (req: AuthRequest, res: Response) => {
  const { token } = (req.body ?? {}) as { token?: unknown };
  if (!isExpoPushToken(token)) {
    res.status(400).json({ error: 'Invalid push token' });
    return;
  }
  try {
    await prisma.pushToken.deleteMany({ where: { token, userId: req.user!.id } });
    res.json({ success: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to remove push token' });
  }
});

export default router;
