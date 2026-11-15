import type { TZDate } from '@date-fns/tz';
import { Card, CardContent } from '@packages/ui/components/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@packages/ui/components/empty';
import { cn } from '@packages/ui/lib/utils';
import { CalendarCheckIcon } from 'lucide-react';
import { servicesSummary, STATUS_DOT_CLASSES, STATUS_LABELS } from '../appointment-status';
import { formatDayHeading, formatTime, isSameDate, toZoned } from '../calendar';
import type { Appointment } from '../types';

type AppointmentListProps = {
  days: TZDate[];
  timeZone: string;
  appointments: Appointment[];
  showProfessional: boolean;
  onOpen: (appointmentId: string) => void;
};

export function AppointmentList({ days, timeZone, appointments, showProfessional, onOpen }: AppointmentListProps) {
  const groups = days
    .map((day) => ({
      day,
      appointments: appointments.filter((appointment) => isSameDate(toZoned(appointment.startAt, timeZone), day)),
    }))
    .filter((group) => group.appointments.length > 0);

  if (groups.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarCheckIcon />
          </EmptyMedia>
          <EmptyTitle>Nenhum agendamento</EmptyTitle>
          <EmptyDescription>Não há agendamentos neste período com os filtros escolhidos.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section key={group.day.toISOString()} className="flex flex-col gap-2">
          <h2 className="text-sm font-medium first-letter:uppercase">{formatDayHeading(group.day)}</h2>
          <Card className="py-0">
            <CardContent className="px-0">
              <ul className="flex flex-col divide-y">
                {group.appointments.map((appointment) => (
                  <li key={appointment.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(appointment.id)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left outline-none hover:bg-accent/50 focus-visible:bg-accent/50"
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
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      ))}
    </div>
  );
}
