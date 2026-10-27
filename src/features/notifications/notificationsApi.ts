import { api } from '@/api/client';
import { NotificationListSchema, NotificationSchema, ReadAllSchema } from '@/api/schemas/notifications';

export const notificationsApi = {
  list: () => api.get('/api/notifications', NotificationListSchema),
  markRead: (id: string) =>
    api.patch(`/api/notifications/${encodeURIComponent(id)}/read`, {}, NotificationSchema),
  markAllRead: () => api.patch('/api/notifications/read-all', {}, ReadAllSchema),
};
