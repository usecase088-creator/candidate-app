import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { NotificationList } from '@/api/schemas/notifications';

import { notificationsApi } from '../notificationsApi';

export const NOTIFICATIONS_KEY = ['notifications'] as const;

export const useNotifications = () =>
  useQuery({ queryKey: NOTIFICATIONS_KEY, queryFn: notificationsApi.list, staleTime: 15_000 });

/** Unread number for badges; undefined until the list is loaded. */
export const useUnreadCount = () => useNotifications().data?.unreadCount;

/** Mark one read at once on screen, put it back if the server refuses. */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const before = queryClient.getQueryData<NotificationList>(NOTIFICATIONS_KEY);
      if (before) {
        const wasUnread = before.data.some((n) => n.id === id && !n.read);
        queryClient.setQueryData<NotificationList>(NOTIFICATIONS_KEY, {
          ...before,
          data: before.data.map((n) => (n.id === id ? { ...n, read: true } : n)),
          unreadCount: Math.max(0, before.unreadCount - (wasUnread ? 1 : 0)),
        });
      }
      return { before };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.before) queryClient.setQueryData(NOTIFICATIONS_KEY, ctx.before);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      const before = queryClient.getQueryData<NotificationList>(NOTIFICATIONS_KEY);
      if (before) {
        queryClient.setQueryData<NotificationList>(NOTIFICATIONS_KEY, {
          ...before,
          data: before.data.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        });
      }
    },
  });
}
