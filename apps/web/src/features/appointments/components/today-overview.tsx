import { TZDate } from '@date-fns/tz';
import { Button } from '@packages/ui/components/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@packages/ui/components/card';
import { cn } from '@packages/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon, CalendarCheckIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useBusinessTimezone } from '@/features/businesses';
import { useNow } from '@/shared/hooks/use-now';
import { formatCurrency } from '@/shared/lib/format-currency';
import { appointmentQueries } from '../api/appointments.queries';
import { isInactive, servicesSummary, STATUS_DOT_CLASSES, STATUS_LABELS } from '../appointment-status';
import { fetchRange, formatTime, toDateKey, toZoned } from '../calendar';
import { useAppointmentScope } from '../hooks/use-appointment-scope';
import { appointmentLink } from '../links';
import { appointmentsPath } from '../loaders';
import { AppointmentStatus } from '../types';

const MAX_UPCOMING = 6;

const MAX_UPCOMING_COMPACT = 4;

function useTodayAppointments(businessId: string) {
  const timeZone = useBusinessTimezone(businessId);
  const scope = useAppointmentScope(businessId);
  const now = useNow();
  const today = new TZDate(now, timeZone);
  const { data = [], isPending } = useQuery(appointmentQueries.list(businessId, fetchRange('day', today)));

  const appointments = data.filter(
    (appointment) =>
      !isInactive(appointment) && (scope.canManage || appointment.professional.id === scope.viewerProfessionalId),
  );

  return {
    isPending,
    timeZone,
    todayKey: toDateKey(today),
    showProfessional: scope.canManage,
    appointments,
    upcoming: appointments.filter(({ endAt }) => new Date(endAt).getTime() > now),
    received: appointments.reduce((sum, appointment) => sum + appointment.paidAmount, 0),
    toReceive: appointments
      .filter(({ status }) => status === AppointmentStatus.COMPLETED)
      .reduce((sum, appointment) => sum + appointment.balance, 0),
    inProgress: appointments.filter(({ status }) => status === AppointmentStatus.IN_PROGRESS).length,
  };
}

type TodayOverviewProps = {
  businessId: string;
};

export function TodayOverview({ businessId }: TodayOverviewProps) {
  const today = useTodayAppointments(businessId);

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Agendamentos hoje" value={today.isPending ? '–' : String(today.appointments.length)} />
        <StatTile label="Em atendimento agora" value={today.isPending ? '–' : String(today.inProgress)} />
        <StatTile label="Recebido hoje" value={today.isPending ? '–' : formatCurrency(today.received)} />
        <StatTile
          label="A receber dos concluídos"
          value={today.isPending ? '–' : formatCurrency(today.toReceive)}
          hint={today.toReceive > 0 ? 'Registre no detalhe do agendamento' : undefined}
        />
      </dl>

      <Card>
        <CardHeader>
          <CardTitle>Próximos de hoje</CardTitle>
          <CardAction>
            <AppointmentsLink businessId={businessId} />
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          <UpcomingList businessId={businessId} today={today} limit={MAX_UPCOMING} />
        </CardContent>
      </Card>
    </div>
  );
}

export function TodaySummary({ businessId }: TodayOverviewProps) {
  const today = useTodayAppointments(businessId);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Hoje</CardTitle>
        <CardAction>
          <AppointmentsLink businessId={businessId} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-0">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-6">
          <CompactStat label="Agendamentos" value={today.isPending ? '–' : String(today.appointments.length)} />
          <CompactStat label="Em atendimento" value={today.isPending ? '–' : String(today.inProgress)} />
          <CompactStat label="Recebido" value={today.isPending ? '–' : formatCurrency(today.received)} />
          <CompactStat label="A receber" value={today.isPending ? '–' : formatCurrency(today.toReceive)} />
        </dl>
        <div className="border-t pt-2">
          <UpcomingList businessId={businessId} today={today} limit={MAX_UPCOMING_COMPACT} />
        </div>
      </CardContent>
    </Card>
  );
}

type AppointmentsLinkProps = {
  businessId: string;
};

function AppointmentsLink({ businessId }: AppointmentsLinkProps) {
  return (
    <Button variant="ghost" size="sm" nativeButton={false} render={<Link to={appointmentsPath(businessId)} />}>
      Ver agenda
      <ArrowRightIcon />
    </Button>
  );
}

type UpcomingListProps = {
  businessId: string;
  today: ReturnType<typeof useTodayAppointments>;
  limit: number;
};

function UpcomingList({ businessId, today, limit }: UpcomingListProps) {
  const { upcoming, appointments, timeZone, todayKey, showProfessional } = today;

  if (upcoming.length === 0) {
    return (
      <p className="flex items-center gap-2 px-6 py-1 text-sm text-muted-foreground">
        <CalendarCheckIcon className="size-4" />
        {appointments.length === 0 ? 'Nenhum agendamento hoje.' : 'Os atendimentos de hoje já terminaram.'}
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y">
      {upcoming.slice(0, limit).map((appointment) => (
        <li key={appointment.id}>
          <Link
            to={appointmentLink(businessId, appointment, timeZone, todayKey)}
            className="flex items-start gap-3 px-6 py-3 outline-none hover:bg-accent/50 focus-visible:bg-accent/50"
          >
            <span className="w-12 shrink-0 text-sm font-medium tabular-nums">
              {formatTime(toZoned(appointment.startAt, timeZone))}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate font-medium">{appointment.customer.name}</span>
              <span className="truncate text-sm text-muted-foreground">
                {servicesSummary(appointment)}
                {showProfessional && ` · ${appointment.professional.name}`}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('size-2 rounded-full', STATUS_DOT_CLASSES[appointment.status])} />
              {STATUS_LABELS[appointment.status]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

type StatTileProps = {
  label: string;
  value: string;
  hint?: ReactNode;
};

function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tracking-tight tabular-nums">{value}</dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}

type CompactStatProps = {
  label: string;
  value: string;
};

function CompactStat({ label, value }: CompactStatProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-lg font-semibold tracking-tight tabular-nums">{value}</dd>
    </div>
  );
}
