import type { TZDate } from '@date-fns/tz';
import { useQuery } from '@tanstack/react-query';
import type { BusinessHour } from '@/features/businesses';
import { professionalQueries, type Professional } from '@/features/professionals';
import { closedShades, gridBounds, timeOffShades, workingRange } from '../appointment-grid';
import { isInactive } from '../appointment-status';
import { assignLanes, dayMinuteRange, formatDayHeading, formatWeekday, isSameDate, minutesToTime } from '../calendar';
import type { Appointment } from '../types';
import { AppointmentBlock } from './appointment-block';
import { TimeGrid, type TimeGridColumn } from './time-grid';

type WeekViewProps = {
  businessId: string;
  days: TZDate[];
  today: TZDate;
  timeZone: string;
  professionals: Professional[];
  appointments: Appointment[];
  businessHours: BusinessHour[];
  nowMinutes: number;
  onOpen: (appointmentId: string) => void;
  onOpenDay: (day: TZDate) => void;
  onCreateAt: (day: TZDate, minutes: number) => void;
  canMove: (appointment: Appointment) => boolean;
  onMove: (appointmentId: string, columnKey: string, minutes: number) => void;
};

export function WeekView({
  businessId,
  days,
  today,
  timeZone,
  professionals,
  appointments,
  businessHours,
  nowMinutes,
  onOpen,
  onOpenDay,
  onCreateAt,
  canMove,
  onMove,
}: WeekViewProps) {
  const [single] = professionals.length === 1 ? professionals : [];
  const { data: workingHours } = useQuery({
    ...professionalQueries.workingHours(businessId, single?.id ?? ''),
    enabled: Boolean(single),
  });
  const { data: timeOffs } = useQuery({
    ...professionalQueries.timeOffs(businessId, single?.id ?? ''),
    enabled: Boolean(single),
  });

  const placedByDay = days.map((day) =>
    appointments.flatMap((appointment) => {
      const range = dayMinuteRange(appointment.startAt, appointment.endAt, day, timeZone);
      return range ? [{ appointment, ...range }] : [];
    }),
  );
  const bounds = gridBounds(businessHours, placedByDay.flat());

  const columns: TimeGridColumn[] = days.map((day, index) => {
    const isToday = isSameDate(day, today);
    return {
      key: day.toISOString(),
      slotLabel: (minutes) => `Agendar em ${formatDayHeading(day)} às ${minutesToTime(minutes)}`,
      onSlotClick: (minutes) => onCreateAt(day, minutes),
      isToday,
      header: (
        <button
          type="button"
          onClick={() => onOpenDay(day)}
          className="flex flex-col items-center rounded-lg px-2 leading-tight outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <span className="text-xs text-muted-foreground uppercase">{formatWeekday(day)}</span>
          <span className="text-lg font-semibold tabular-nums">{day.getDate()}</span>
        </button>
      ),
      shades: [
        ...closedShades(
          single ? workingRange(workingHours, businessHours, day) : workingRange(undefined, businessHours, day),
          bounds,
          single ? 'Não atende' : 'Fechado',
        ),
        ...(single ? timeOffShades(timeOffs, day, timeZone) : []),
      ],
      blocks: assignLanes(placedByDay[index] ?? []).map(({ appointment, start, end, lane, lanes }) => ({
        key: appointment.id,
        start,
        end,
        lane,
        lanes,
        draggable: canMove(appointment),
        group: appointment.professional.id,
        occupies: !isInactive(appointment),
        content: (
          <AppointmentBlock
            appointment={appointment}
            timeZone={timeZone}
            showProfessional={!single}
            onOpen={() => onOpen(appointment.id)}
          />
        ),
      })),
    };
  });

  return (
    <TimeGrid
      columns={columns}
      startMinutes={bounds.start}
      endMinutes={bounds.end}
      nowMinutes={nowMinutes}
      minColumnWidth="8rem"
      onBlockMove={onMove}
    />
  );
}
