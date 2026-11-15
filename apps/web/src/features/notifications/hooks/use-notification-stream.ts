import { toast } from '@packages/ui/components/sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { appointmentQueries } from '@/features/appointments';
import { notificationsApi } from '../api/notifications.api';
import { notificationQueries } from '../api/notifications.queries';
import type { Notification } from '../types';

const MAX_RETRY_DELAY_MS = 30_000;

export const useNotificationStream = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let hasConnected = false;
    let disposed = false;

    const refreshAll = () => queryClient.invalidateQueries({ queryKey: notificationQueries.all() });

    const receive = (event: MessageEvent<string>) => {
      const notification = JSON.parse(event.data) as Notification;
      queryClient.setQueryData(notificationQueries.unreadCount().queryKey, (current) =>
        current && { count: current.count + 1 },
      );
      void queryClient.invalidateQueries({ queryKey: notificationQueries.lists() });
      if (notification.businessId && notification.appointmentId) {
        void queryClient.invalidateQueries({ queryKey: appointmentQueries.all(notification.businessId) });
      }
      toast(notification.title, { description: notification.message });
    };

    const scheduleReconnect = () => {
      attempts += 1;
      const delay = Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** attempts);
      retryTimer = setTimeout(() => {
        void queryClient
          .query({ ...notificationQueries.unreadCount(), staleTime: 0 })
          .then(() => {
            if (!disposed) connect();
          })
          .catch(() => {
            if (!disposed) scheduleReconnect();
          });
      }, delay);
    };

    const connect = () => {
      const current = new EventSource(notificationsApi.streamUrl(), { withCredentials: true });
      source = current;
      current.addEventListener('notification', receive);
      current.addEventListener('open', () => {
        attempts = 0;
        if (hasConnected) void refreshAll();
        hasConnected = true;
      });
      current.addEventListener('error', () => {
        if (current.readyState !== EventSource.CLOSED) return;
        current.close();
        scheduleReconnect();
      });
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      source?.close();
    };
  }, [queryClient]);
};
