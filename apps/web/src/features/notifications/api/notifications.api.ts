import { api } from '@/shared/api/http';
import type { CursorPaginated } from '@/shared/api/types';
import { env } from '@/shared/env';
import type { Notification, NotificationStatus, UnreadCount } from '../types';

export type NotificationFilter = 'all' | NotificationStatus;

export const NOTIFICATIONS_PAGE_SIZE = 15;

const NOTIFICATIONS_PATH = '/me/notifications';

export const notificationsApi = {
  list: (filter: NotificationFilter, cursor: string | null) =>
    api.get<CursorPaginated<Notification>>(NOTIFICATIONS_PATH, {
      params: {
        status: filter === 'all' ? undefined : filter,
        cursor: cursor ?? undefined,
        limit: NOTIFICATIONS_PAGE_SIZE,
      },
    }),
  unreadCount: () => api.get<UnreadCount>(`${NOTIFICATIONS_PATH}/unread-count`),
  markRead: (notificationId: string) => api.post<Notification>(`${NOTIFICATIONS_PATH}/${notificationId}/read`),
  markAllRead: () => api.post<void>(`${NOTIFICATIONS_PATH}/read-all`),
  streamUrl: () => `${env.VITE_API_URL}${NOTIFICATIONS_PATH}/stream`,
};
