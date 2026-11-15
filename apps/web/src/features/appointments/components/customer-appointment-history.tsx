import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@packages/ui/components/empty';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@packages/ui/components/select';
import { ListSkeleton } from '@packages/ui/components/skeletons';
import { Spinner } from '@packages/ui/components/spinner';
import { cn } from '@packages/ui/lib/utils';
import { useInfiniteQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HistoryIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { formatCurrency } from '@/shared/lib/format-currency';
import { appointmentQueries } from '../api/appointments.queries';
import { servicesSummary, STATUS_DOT_CLASSES, STATUS_LABELS } from '../appointment-status';
import { formatTime, todayKey, toZoned } from '../calendar';
import { appointmentLink } from '../links';
import { AppointmentStatus } from '../types';
import { CustomerAppointmentsTable } from './customer-appointments-table';

const ALL = 'all';

const statusItems = [
  { value: ALL, label: 'Todos os status' },
  ...Object.values(AppointmentStatus).map((status) => ({ value: status, label: STATUS_LABELS[status] })),
];

const isAppointmentStatus = (value: unknown): value is AppointmentStatus =>
  Object.values(AppointmentStatus).some((status) => status === value);

type CustomerAppointmentHistoryProps = {
  businessId: string;
  customerId: string;
  timeZone: string;
};

export function CustomerAppointmentHistory({ businessId, customerId, timeZone }: CustomerAppointmentHistoryProps) {
  const [status, setStatus] = useState<AppointmentStatus | null>(null);
  const { data, isPending, isPlaceholderData, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery(
    appointmentQueries.byCustomer(businessId, customerId, status),
  );
  const appointments = (data?.pages ?? []).flatMap((page) => page.data);
  const total = data?.pages[0]?.meta.total ?? 0;
  const today = todayKey(timeZone);

  return (
    <section aria-labelledby="customer-history-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 id="customer-history-title" className="text-lg font-semibold tracking-tight">
            Histórico de agendamentos
          </h2>
          {data && (
            <p className="text-sm text-muted-foreground">
              {total} {total === 1 ? 'agendamento' : 'agendamentos'}
            </p>
          )}
        </div>
        <Select
          items={statusItems}
          value={status ?? ALL}
          onValueChange={(value) => setStatus(isAppointmentStatus(value) ? value : null)}
        >
          <SelectTrigger aria-label="Filtrar por status" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending && <ListSkeleton rows={3} avatar={false} />}

      {data && appointments.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HistoryIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum agendamento</EmptyTitle>
            <EmptyDescription>
              {status ? 'Nenhum agendamento com esse status.' : 'Este cliente ainda não tem agendamentos.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {appointments.length > 0 && (
        <Card className={cn('py-0 transition-opacity sm:hidden', isPlaceholderData && 'opacity-60')}>
          <CardContent className="px-0">
            <ul className="flex flex-col divide-y">
              {appointments.map((appointment) => {
                const start = toZoned(appointment.startAt, timeZone);
                return (
                  <li key={appointment.id}>
                    <Link
                      to={appointmentLink(businessId, appointment, timeZone, today)}
                      className="flex items-start gap-3 px-4 py-3 outline-none hover:bg-accent/50 focus-visible:bg-accent/50"
                    >
                      <span className="flex w-24 shrink-0 flex-col text-sm tabular-nums">
                        <span className="font-medium">{format(start, 'dd/MM/yyyy')}</span>
                        <span className="text-muted-foreground">
                          {format(start, 'EEE', { locale: ptBR })} · {formatTime(start)}
                        </span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate font-medium">{servicesSummary(appointment)}</span>
                        <span className="truncate text-sm text-muted-foreground">
                          {appointment.professional.name} · {formatCurrency(appointment.totalPrice)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn('size-2 rounded-full', STATUS_DOT_CLASSES[appointment.status])} />
                        {STATUS_LABELS[appointment.status]}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {appointments.length > 0 && (
        <CustomerAppointmentsTable
          appointments={appointments}
          timeZone={timeZone}
          linkOf={(appointment) => appointmentLink(businessId, appointment, timeZone, today)}
          className={cn('hidden transition-opacity sm:block', isPlaceholderData && 'opacity-60')}
        />
      )}

      {hasNextPage && (
        <Button
          type="button"
          variant="outline"
          className="self-center"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage && <Spinner />}
          Ver mais
        </Button>
      )}
    </section>
  );
}
