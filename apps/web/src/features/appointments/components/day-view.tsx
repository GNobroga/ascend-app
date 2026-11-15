import type { TZDate } from '@date-fns/tz';
import { Avatar, AvatarFallback, AvatarImage } from '@packages/ui/components/avatar';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@packages/ui/components/empty';
import { useQueries } from '@tanstack/react-query';
import { CalendarOffIcon } from 'lucide-react';
import type { BusinessHour } from '@/features/businesses';
import { professionalQueries, type Professional } from '@/features/professionals';
import { initialsOf } from '@/shared/lib/initials';
import { closedShades, freeShades, gridBounds, timeOffShades, workingRange } from '../appointment-grid';
import { isInactive } from '../appointment-status';
import { assignLanes, dayMinuteRange, minutesToTime } from '../calendar';
import type { Appointment } from '../types';
import { AppointmentBlock } from './appointment-block';
import { TimeGrid, type TimeGridColumn } from './time-grid';

type DayViewProps = {
  businessId: string;
  day: TZDate;
  timeZone: string;
  professionals: Professional[];
  appointments: Appointment[];
  businessHours: BusinessHour[];
  nowMinutes: number | null;
  freeFromMinutes: number;
  onOpen: (appointmentId: string) => void;
  onCreateAt: (professionalId: string, minutes: number) => void;
  canMove: (appointment: Appointment) => boolean;
  onMove: (appointmentId: string, columnKey: string, minutes: number) => void;
};

export function DayView({
  businessId,
  day,
  timeZone,
  professionals,
  appointments,
  businessHours,
  nowMinutes,
  freeFromMinutes,
  onOpen,
  onCreateAt,
  canMove,
  onMove,
}: DayViewProps) {
  const workingHours = useQueries({
    queries: professionals.map(({ id }) => professionalQueries.workingHours(businessId, id)),
  });
  const timeOffs = useQueries({
    queries: professionals.map(({ id }) => professionalQueries.timeOffs(businessId, id)),
  });

  if (professionals.length === 0) {
    return (
      <Empty className="h-full border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarOffIcon />
          </EmptyMedia>
          <EmptyTitle>Nenhum profissional selecionado</EmptyTitle>
          <EmptyDescription>Escolha ao menos um profissional nos filtros para ver a agenda.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const placed = appointments.flatMap((appointment) => {
    const range = dayMinuteRange(appointment.startAt, appointment.endAt, day, timeZone);
    return range ? [{ appointment, ...range }] : [];
  });
  const bounds = gridBounds(businessHours, placed);

  const columns: TimeGridColumn[] = professionals.map((professional, index) => {
    const open = workingRange(workingHours[index]?.data, businessHours, day);
    const dayTimeOffs = timeOffShades(timeOffs[index]?.data, day, timeZone);
    const own = placed.filter(({ appointment }) => appointment.professional.id === professional.id);
    const busy = [...dayTimeOffs, ...own.filter(({ appointment }) => !isInactive(appointment))];
    return {
      key: professional.id,
      slotLabel: (minutes) => `Agendar às ${minutesToTime(minutes)} com ${professional.displayName}`,
      onSlotClick: (minutes) => onCreateAt(professional.id, minutes),
      isToday: nowMinutes !== null,
      header: (
        <span className="flex min-w-0 items-center gap-2">
          <Avatar size="sm">
            {professional.photoUrl && <AvatarImage src={professional.photoUrl} alt="" />}
            <AvatarFallback>{initialsOf(professional.displayName)}</AvatarFallback>
          </Avatar>
          <span className="truncate font-medium">{professional.displayName}</span>
        </span>
      ),
      shades: [
        ...freeShades(open, busy, freeFromMinutes),
        ...closedShades(open, bounds, 'Não atende'),
        ...dayTimeOffs,
      ],
      blocks: assignLanes(own).map(
        ({ appointment, start, end, lane, lanes }) => ({
          key: appointment.id,
          start,
          end,
          lane,
          lanes,
          draggable: canMove(appointment),
          occupies: !isInactive(appointment),
          content: <AppointmentBlock appointment={appointment} timeZone={timeZone} onOpen={() => onOpen(appointment.id)} />,
        }),
      ),
    };
  });

  return (
    <TimeGrid
      columns={columns}
      startMinutes={bounds.start}
      endMinutes={bounds.end}
      nowMinutes={nowMinutes}
      minColumnWidth="11rem"
      onBlockMove={onMove}
    />
  );
}
