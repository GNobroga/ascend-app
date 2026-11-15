import { Button } from '@packages/ui/components/button';
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@packages/ui/components/popover';
import { ToggleGroup, ToggleGroupItem } from '@packages/ui/components/toggle-group';
import { useQuery } from '@tanstack/react-query';
import { BellIcon, CheckCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { businessQueries } from '@/features/businesses';
import type { NotificationFilter } from '../api/notifications.api';
import { useMarkAllNotificationsRead, useMarkNotificationRead } from '../api/notifications.mutations';
import { notificationQueries } from '../api/notifications.queries';
import { useNotificationStream } from '../hooks/use-notification-stream';
import { notificationLink } from '../links';
import { NotificationStatus, type Notification } from '../types';
import { NotificationList } from './notification-list';

const MAX_BADGE_COUNT = 9;

const isNotificationFilter = (value: unknown): value is NotificationFilter =>
  value === 'all' || value === NotificationStatus.UNREAD;

export function NotificationBell() {
  useNotificationStream();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const { data: unread } = useQuery(notificationQueries.unreadCount());
  const { data: businesses = [] } = useQuery(businessQueries.mine());
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = unread?.count ?? 0;
  const badge = unreadCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(unreadCount);

  const handleSelect = (notification: Notification) => {
    if (notification.status === NotificationStatus.UNREAD) markRead.mutate(notification);
    const link = notificationLink(notification, new Set(businesses.map(({ id }) => id)));
    if (!link) return;
    setOpen(false);
    void navigate(link);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="relative rounded-full"
            aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : 'Notificações'}
          />
        }
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-semibold text-primary-foreground ring-2 ring-background">
            {badge}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <PopoverTitle>Notificações</PopoverTitle>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheckIcon />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <div className="border-b px-4 py-2">
          <ToggleGroup
            aria-label="Filtrar notificações"
            variant="outline"
            size="sm"
            spacing={0}
            value={[filter]}
            onValueChange={([next]) => {
              if (isNotificationFilter(next)) setFilter(next);
            }}
          >
            <ToggleGroupItem value="all" className="px-3">
              Todas
            </ToggleGroupItem>
            <ToggleGroupItem value={NotificationStatus.UNREAD} className="px-3">
              Não lidas
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <NotificationList filter={filter} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}
