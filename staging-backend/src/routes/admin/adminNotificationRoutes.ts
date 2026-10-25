import logger from '../../lib/logger';
import { Router, Response } from 'express';
import prisma from '../../lib/prisma';
import { requireAdmin, AdminAuthRequest } from '../../middleware/auth';
import { sseManager } from '../../lib/sseManager';

const router = Router();

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
router.get('/stream', requireAdmin, (req: AdminAuthRequest, res: Response) => {
  // Let the SSEManager handle headers and cleanup
  sseManager.addAdminClient(res);
});

router.get('/', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const notifications = await prisma.adminNotification.findMany({
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

router.patch('/:id/read', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const notification = await prisma.adminNotification.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    const updated = await prisma.adminNotification.update({
      where: { id: notification.id },
      data: { read: true },
    });
    res.json(formatNotification(updated));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/read-all', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    await prisma.adminNotification.updateMany({
      where: { read: false },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
