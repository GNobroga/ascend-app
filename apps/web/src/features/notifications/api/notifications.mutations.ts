import { useMutation, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import type { CursorPaginated } from '@/shared/api/types';
import { NotificationStatus, type Notification } from '../types';
import { notificationsApi } from './notifications.api';
import { notificationQueries } from './notifications.queries';

type NotificationPages = InfiniteData<CursorPaginated<Notification>>;

const markInLists = (queryClient: QueryClient, shouldMark: (notification: Notification) => boolean) => {
  const readAt = new Date().toISOString();
  queryClient.setQueriesData<NotificationPages>({ queryKey: notificationQueries.lists() }, (data) =>
    data && {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        data: page.data.map((notification) =>
          notification.status === NotificationStatus.UNREAD && shouldMark(notification)
            ? { ...notification, status: NotificationStatus.READ, readAt }
            : notification,
        ),
      })),
    },
  );
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notification: Notification) => notificationsApi.markRead(notification.id),
    onMutate: (notification) => {
      if (notification.status !== NotificationStatus.UNREAD) return;
      markInLists(queryClient, ({ id }) => id === notification.id);
      queryClient.setQueryData(notificationQueries.unreadCount().queryKey, (current) =>
        current && { count: Math.max(0, current.count - 1) },
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationQueries.all() }),
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      markInLists(queryClient, () => true);
      queryClient.setQueryData(notificationQueries.unreadCount().queryKey, { count: 0 });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationQueries.all() }),
  });
};
