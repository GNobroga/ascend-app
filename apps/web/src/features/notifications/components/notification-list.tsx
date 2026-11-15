import { Button } from '@packages/ui/components/button';
import { Spinner } from '@packages/ui/components/spinner';
import { useInfiniteQuery } from '@tanstack/react-query';
import { BellOffIcon } from 'lucide-react';
import { useNow } from '@/shared/hooks/use-now';
import type { NotificationFilter } from '../api/notifications.api';
import { notificationQueries } from '../api/notifications.queries';
import type { Notification } from '../types';
import { NotificationItem } from './notification-item';

type NotificationListProps = {
  filter: NotificationFilter;
  onSelect: (notification: Notification) => void;
};

export function NotificationList({ filter, onSelect }: NotificationListProps) {
  const { data, isPending, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery(
    notificationQueries.list(filter),
  );
  const now = useNow();

  if (isPending) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
        Não foi possível carregar as notificações.
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  const notifications = data.pages.flatMap((page) => page.data);

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
        <BellOffIcon className="size-5" />
        {filter === 'all' ? 'Você ainda não tem notificações.' : 'Tudo lido por aqui.'}
      </div>
    );
  }

  return (
    <div className="max-h-[min(28rem,60svh)] overflow-y-auto">
      <ul className="flex flex-col divide-y">
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} now={now} onSelect={onSelect} />
        ))}
      </ul>
      {hasNextPage && (
        <div className="flex justify-center border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage && <Spinner />}
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  );
}
