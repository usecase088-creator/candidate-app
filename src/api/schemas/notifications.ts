// GET /api/notifications, PATCH /api/notifications/:id/read, PATCH /api/notifications/read-all (API.md §25, §26).
import { z } from 'zod';

export const NotificationSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    message: z.string(),
    read: z.boolean(),
    link: z.string().nullish(),
    createdAt: z.string(),
  })
  .loose();
export type AppNotification = z.infer<typeof NotificationSchema>;

export const NotificationListSchema = z
  .object({ data: z.array(NotificationSchema), unreadCount: z.number() })
  .loose();
export type NotificationList = z.infer<typeof NotificationListSchema>;

export const ReadAllSchema = z.object({ ok: z.boolean() }).loose();
