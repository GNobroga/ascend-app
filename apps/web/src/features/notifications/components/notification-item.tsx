import { cn } from '@packages/ui/lib/utils';
import { formatDistanceStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NOTIFICATION_ICONS } from '../notification-icons';
import { NotificationStatus, type Notification } from '../types';

const RECENT_MS = 60_000;

type NotificationItemProps = {
  notification: Notification;
  now: number;
  onSelect: (notification: Notification) => void;
};

export function NotificationItem({ notification, now, onSelect }: NotificationItemProps) {
  const Icon = NOTIFICATION_ICONS[notification.type];
  const isUnread = notification.status === NotificationStatus.UNREAD;
  const createdAt = new Date(notification.createdAt);
  const relativeTime =
    now - createdAt.getTime() < RECENT_MS
      ? 'agora'
      : formatDistanceStrict(createdAt, now, { addSuffix: true, locale: ptBR });

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(notification)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
      >
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full',
            isUnread ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn('text-sm', isUnread ? 'font-medium' : 'text-muted-foreground')}>{notification.title}</span>
          <span className="line-clamp-2 text-sm text-muted-foreground">{notification.message}</span>
          <time dateTime={notification.createdAt} className="text-xs text-muted-foreground">
            {relativeTime}
          </time>
        </span>
        {isUnread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Não lida" />}
      </button>
    </li>
  );
}
