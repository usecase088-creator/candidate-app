import logger from '../lib/logger';
import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

import { sseManager } from '../lib/sseManager';

function formatNotification(n: {
  id: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: Date;
}) {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    read: n.read,
    unread: !n.read,
    link: n.link,
    createdAt: n.createdAt,
  };
}

// ── SSE Stream Endpoint ──────────────────────────────────────────────────────
router.get('/stream', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    // Let the SSEManager handle headers and cleanup
    sseManager.addUserClient(userId, res);
  } catch (err) {
    logger.error('SSE stream error:', err);
    if (!res.headersSent) {
      res.status(500).end();
    }
  }
});

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.inAppNotification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = notifications.filter((n) => !n.read).length;
    res.json({
      data: notifications.map(formatNotification),
      unreadCount,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const notification = await prisma.inAppNotification.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    });
    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    const updated = await prisma.inAppNotification.update({
      where: { id: notification.id },
      data: { read: true },
    });
    res.json(formatNotification(updated));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/read-all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.inAppNotification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
