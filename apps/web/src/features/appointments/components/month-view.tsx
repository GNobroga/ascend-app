import type { TZDate } from '@date-fns/tz';
import { cn } from '@packages/ui/lib/utils';
import { STATUS_DOT_CLASSES } from '../appointment-status';
import { formatTime, formatWeekday, isSameDate, toZoned } from '../calendar';
import type { Appointment } from '../types';

const MAX_VISIBLE_PER_DAY = 3;

type MonthViewProps = {
  days: TZDate[];
  month: TZDate;
  today: TZDate;
  timeZone: string;
  appointments: Appointment[];
  onOpen: (appointmentId: string) => void;
  onOpenDay: (day: TZDate) => void;
};

export function MonthView({ days, month, today, timeZone, appointments, onOpen, onOpenDay }: MonthViewProps) {
  const weekdays = days.slice(0, 7);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="grid shrink-0 grid-cols-7 border-b">
        {weekdays.map((day) => (
          <div key={day.getDay()} className="px-2 py-2 text-center text-xs text-muted-foreground uppercase">
            {formatWeekday(day)}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-[minmax(7rem,1fr)] grid-cols-7 overflow-y-auto overscroll-contain">
        {days.map((day) => {
          const isOutside = day.getMonth() !== month.getMonth();
          const dayAppointments = isOutside
            ? []
            : appointments.filter((appointment) => isSameDate(toZoned(appointment.startAt, timeZone), day));
          const hidden = dayAppointments.length - MAX_VISIBLE_PER_DAY;

          return (
            <div
              key={day.toISOString()}
              className={cn('flex min-w-0 flex-col gap-1 border-b border-l p-1.5 nth-[7n+1]:border-l-0', isOutside && 'bg-muted/40')}
            >
              <button
                type="button"
                onClick={() => onOpenDay(day)}
                className={cn(
                  'flex size-7 items-center justify-center self-start rounded-full text-sm tabular-nums outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/30',
                  isOutside && 'text-muted-foreground',
                  isSameDate(day, today) && 'bg-primary font-semibold text-primary-foreground hover:bg-primary/90',
                )}
              >
                {day.getDate()}
              </button>
              {dayAppointments.slice(0, MAX_VISIBLE_PER_DAY).map((appointment) => (
                <button
                  key={appointment.id}
                  type="button"
                  onClick={() => onOpen(appointment.id)}
                  className="flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-xs outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/30"
                >
                  <span className={cn('size-2 shrink-0 rounded-full', STATUS_DOT_CLASSES[appointment.status])} />
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatTime(toZoned(appointment.startAt, timeZone))}
                  </span>
                  <span className="truncate">{appointment.customer.name}</span>
                </button>
              ))}
              {hidden > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenDay(day)}
                  className="self-start rounded-md px-1 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
                >
                  +{hidden} {hidden === 1 ? 'outro' : 'outros'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
