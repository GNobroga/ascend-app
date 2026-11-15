import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { notificationsApi, type NotificationFilter } from './notifications.api';

export const notificationQueries = {
  all: () => ['notifications'] as const,
  lists: () => [...notificationQueries.all(), 'list'] as const,
  list: (filter: NotificationFilter) =>
    infiniteQueryOptions({
      queryKey: [...notificationQueries.lists(), filter],
      queryFn: ({ pageParam }) => notificationsApi.list(filter, pageParam),
      initialPageParam: null as string | null,
      getNextPageParam: ({ meta }) => (meta.hasMore ? meta.nextCursor : null),
    }),
  unreadCount: () =>
    queryOptions({
      queryKey: [...notificationQueries.all(), 'unread-count'],
      queryFn: notificationsApi.unreadCount,
    }),
};
