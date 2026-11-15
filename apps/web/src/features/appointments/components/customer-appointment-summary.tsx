import { Skeleton } from '@packages/ui/components/skeleton';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ReactNode } from 'react';
import { formatCurrency } from '@/shared/lib/format-currency';
import type { CustomerAppointmentSummary as Summary } from '../api/appointments.api';
import { appointmentQueries } from '../api/appointments.queries';
import { formatTime, toZoned } from '../calendar';

const SUMMARY_TILES = 4;

const pluralize = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;

type CustomerAppointmentSummaryProps = {
  businessId: string;
  customerId: string;
  timeZone: string;
};

export function CustomerAppointmentSummary({ businessId, customerId, timeZone }: CustomerAppointmentSummaryProps) {
  const { data } = useQuery(appointmentQueries.customerSummary(businessId, customerId));

  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: SUMMARY_TILES }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <SummaryTile label="Atendimentos" value={data.completedCount} hint={describeAttendance(data)} />
      <SummaryTile
        label="Gasto total"
        value={formatCurrency(data.totalSpent)}
        hint={data.averageTicket === null ? 'Sem atendimento concluído' : `Ticket médio ${formatCurrency(data.averageTicket)}`}
      />
      <SummaryTile
        label="Última visita"
        value={data.lastVisitAt ? format(toZoned(data.lastVisitAt, timeZone), 'dd/MM/yyyy') : '–'}
        hint={
          data.lastVisitAt
            ? `Há ${formatDistanceToNowStrict(new Date(data.lastVisitAt), { locale: ptBR })}`
            : 'Ainda não foi atendido'
        }
      />
      <SummaryTile
        label="Próximo agendamento"
        value={data.nextAppointmentAt ? format(toZoned(data.nextAppointmentAt, timeZone), 'dd/MM/yyyy') : '–'}
        hint={data.nextAppointmentAt ? describeNext(data.nextAppointmentAt, timeZone) : 'Nenhum horário marcado'}
      />
    </dl>
  );
}

const describeAttendance = ({ noShowCount, cancelledCount }: Summary) =>
  `${pluralize(noShowCount, 'falta', 'faltas')} · ${pluralize(cancelledCount, 'cancelado', 'cancelados')}`;

const describeNext = (startAt: string, timeZone: string) => {
  const start = toZoned(startAt, timeZone);
  return `${format(start, 'EEEE', { locale: ptBR })} às ${formatTime(start)}`;
};

type SummaryTileProps = {
  label: string;
  value: ReactNode;
  hint: string;
};

function SummaryTile({ label, value, hint }: SummaryTileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</dd>
      <dd className="truncate text-xs text-muted-foreground first-letter:uppercase">{hint}</dd>
    </div>
  );
}
