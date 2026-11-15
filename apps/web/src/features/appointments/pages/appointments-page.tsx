import { TZDate } from '@date-fns/tz';
import { Button } from '@packages/ui/components/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@packages/ui/components/empty';
import { toast } from '@packages/ui/components/sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@packages/ui/components/select';
import { BlockSkeleton } from '@packages/ui/components/skeletons';
import { ToggleGroup, ToggleGroupItem } from '@packages/ui/components/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@packages/ui/components/tooltip';
import { cn } from '@packages/ui/lib/utils';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { ChevronLeftIcon, ChevronRightIcon, Maximize2Icon, Minimize2Icon, PlusIcon, UserRoundXIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { businessQueries, useBusinessTimezone } from '@/features/businesses';
import { useNow } from '@/shared/hooks/use-now';
import { useUpdateAppointment } from '../api/appointments.mutations';
import { appointmentQueries } from '../api/appointments.queries';
import { isOpen } from '../appointment-status';
import { toStartAt } from '../booking';
import {
  APPOINTMENT_VIEW_LABELS,
  APPOINTMENT_VIEWS,
  fetchRange,
  formatRangeLabel,
  formatShortRangeLabel,
  fromDateKey,
  isSameDate,
  freeTimeStart,
  minutesOfDay,
  minutesToTime,
  shiftDate,
  toDateKey,
  visibleDays,
  type AppointmentView,
} from '../calendar';
import { AppointmentFiltersMenu, DatePicker, ProfessionalFilter } from '../components/appointment-filters';
import { AppointmentList } from '../components/appointment-list';
import { BoardView } from '../components/board-view';
import { AppointmentSheet } from '../components/appointment-sheet';
import { DayView } from '../components/day-view';
import { MonthView } from '../components/month-view';
import { NewAppointmentSheet, type NewAppointmentPrefill } from '../components/new-appointment-sheet';
import { WeekView } from '../components/week-view';
import { useAppointmentScope } from '../hooks/use-appointment-scope';
import { appointmentsSearchParams } from '../search-params';
import { AppointmentStatus, type Appointment } from '../types';

const isAppointmentView = (value: unknown): value is AppointmentView => APPOINTMENT_VIEWS.some((view) => view === value);

function AppointmentsPage() {
  const { businessId } = useParams();
  if (!businessId) return null;

  return <Appointments businessId={businessId} />;
}

type AppointmentsProps = {
  businessId: string;
};

function Appointments({ businessId }: AppointmentsProps) {
  const timeZone = useBusinessTimezone(businessId);
  const scope = useAppointmentScope(businessId);
  const now = useNow();
  const [params, setParams] = useQueryStates(appointmentsSearchParams);
  const { data: businessHours } = useSuspenseQuery(businessQueries.hours(businessId));
  const [newAppointment, setNewAppointment] = useState<NewAppointmentPrefill | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasOpenSheet = params.appointment !== null || newAppointment !== null;

  useEffect(() => {
    if (!isExpanded || hasOpenSheet) return;
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) setIsExpanded(false);
    };
    document.addEventListener('keydown', exitOnEscape);
    return () => document.removeEventListener('keydown', exitOnEscape);
  }, [isExpanded, hasOpenSheet]);

  const today = new TZDate(now, timeZone);
  const todayKey = toDateKey(today);
  const date = fromDateKey(params.date ?? todayKey, timeZone);
  const days = visibleDays(params.view, date);
  const dateKey = toDateKey(date);
  const freeFromMinutes = freeTimeStart(dateKey, todayKey, minutesOfDay(today));
  const { data: appointments = [], isPending, isFetching } = useQuery(
    appointmentQueries.list(businessId, fetchRange(params.view, date)),
  );

  const allIds = scope.professionals.map(({ id }) => id);
  const chosenIds = params.professionals.filter((id) => allIds.includes(id));
  const selectedIds = chosenIds.length > 0 ? chosenIds : allIds;
  const isFiltered = chosenIds.length > 0 || !scope.canManage;
  const visibleProfessionals = scope.professionals.filter(({ id }) => selectedIds.includes(id));
  const visibleAppointments = appointments.filter(
    (appointment) =>
      (!isFiltered || selectedIds.includes(appointment.professional.id)) &&
      (params.cancelled || appointment.status !== AppointmentStatus.CANCELLED),
  );

  const goToDate = (next: Date) => {
    const key = toDateKey(next);
    void setParams({ date: key === todayKey ? null : key });
  };
  const openDay = (day: Date) => void setParams({ view: 'day', date: toDateKey(day) === todayKey ? null : toDateKey(day) });
  const openAppointment = (appointmentId: string) => void setParams({ appointment: appointmentId });
  const updateAppointment = useUpdateAppointment(businessId);
  const canMove = (appointment: Appointment) => scope.canActOn(appointment) && isOpen(appointment);
  const moveAppointment = (appointmentId: string, day: Date, minutes: number, professionalId?: string) => {
    const appointment = appointments.find(({ id }) => id === appointmentId);
    if (!appointment) return;
    const startAt = toStartAt(toDateKey(day), minutesToTime(minutes), timeZone);
    const duration = new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime();
    const target = scope.professionals.find(({ id }) => id === professionalId && id !== appointment.professional.id);
    updateAppointment.mutate(
      {
        appointmentId,
        startAt,
        professionalId: target?.id,
        preview: {
          startAt,
          endAt: new Date(new Date(startAt).getTime() + duration).toISOString(),
          professional: target ? { id: target.id, name: target.displayName } : appointment.professional,
        },
      },
      { onSuccess: () => toast.success(`${appointment.customer.name} remarcado para as ${minutesToTime(minutes)}.`) },
    );
  };
  const createAt = (day: Date, minutes: number, professionalId?: string) =>
    setNewAppointment({ date: toDateKey(day), time: minutesToTime(minutes), professionalId });

  const showProfessionalFilter = scope.canManage && scope.professionals.length > 1;
  const selectProfessionals = (next: string[]) =>
    void setParams({ professionals: next.length === allIds.length ? null : next });
  const toggleProfessional = (professionalId: string) =>
    selectProfessionals(
      selectedIds.includes(professionalId)
        ? selectedIds.filter((id) => id !== professionalId)
        : [...selectedIds, professionalId],
    );

  if (!scope.canManage && scope.viewerProfessionalId === null) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UserRoundXIcon />
          </EmptyMedia>
          <EmptyTitle>Você ainda não atende neste negócio</EmptyTitle>
          <EmptyDescription>
            Peça a um administrador para criar o seu perfil de profissional. Depois disso, seus agendamentos aparecem
            aqui.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className={cn('flex w-full min-w-0 flex-col gap-4', isExpanded && 'fixed inset-0 z-40 bg-canvas p-4 md:p-6')}>
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-3 md:flex-nowrap">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <Button type="button" variant="outline" disabled={params.date === null} onClick={() => goToDate(today)}>
            Hoje
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Anterior"
            onClick={() => goToDate(shiftDate(params.view, date, -1))}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Próximo"
            onClick={() => goToDate(shiftDate(params.view, date, 1))}
          >
            <ChevronRightIcon />
          </Button>
          <DatePicker
            label={formatRangeLabel(params.view, date)}
            shortLabel={formatShortRangeLabel(params.view, date)}
            selectedDate={new Date(date.getFullYear(), date.getMonth(), date.getDate())}
            isFetching={isFetching}
            onSelectDate={(selected) =>
              goToDate(new TZDate(selected.getFullYear(), selected.getMonth(), selected.getDate(), timeZone))
            }
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {showProfessionalFilter && (
            <ProfessionalFilter
              professionals={scope.professionals}
              selectedIds={selectedIds}
              viewerProfessionalId={scope.viewerProfessionalId}
              onToggle={toggleProfessional}
              onSelectAll={() => selectProfessionals(allIds)}
              onSelectOnly={(professionalId) => selectProfessionals([professionalId])}
            />
          )}
          <AppointmentFiltersMenu
            showCancelled={params.cancelled}
            onShowCancelledChange={(show) => void setParams({ cancelled: show || null })}
          />
          <ViewSwitcher view={params.view} onChange={(view) => void setParams({ view: view === 'day' ? null : view })} />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="max-md:hidden"
                  aria-label={isExpanded ? 'Sair da tela cheia' : 'Tela cheia'}
                  onClick={() => setIsExpanded(!isExpanded)}
                />
              }
            >
              {isExpanded ? <Minimize2Icon /> : <Maximize2Icon />}
            </TooltipTrigger>
            <TooltipContent>{isExpanded ? 'Sair da tela cheia (Esc)' : 'Tela cheia'}</TooltipContent>
          </Tooltip>
          <Button
            type="button"
            aria-label="Novo agendamento"
            onClick={() => setNewAppointment({ date: toDateKey(date) })}
          >
            <PlusIcon />
            <span className="max-sm:hidden xl:hidden">Novo</span>
            <span className="max-xl:hidden">Novo agendamento</span>
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'flex flex-col',
          isExpanded ? 'min-h-0 flex-1' : 'md:h-[calc(100svh-9.5rem)] md:min-h-[32rem]',
        )}
      >
        {isPending ? (
          <BlockSkeleton className="h-[36rem] md:h-auto md:min-h-0 md:flex-1" />
        ) : (
          <>
            {params.view === 'board' && (
              <div className="min-h-0 flex-1">
                <BoardView
                  businessId={businessId}
                  timeZone={timeZone}
                  appointments={visibleAppointments}
                  showCancelled={params.cancelled}
                  showProfessional={visibleProfessionals.length > 1}
                  canActOn={scope.canActOn}
                  onOpen={openAppointment}
                />
              </div>
            )}

            <div className={cn('hidden min-h-0 flex-1', params.view !== 'board' && 'md:block')}>
              {params.view === 'day' && (
                <DayView
                  businessId={businessId}
                  day={date}
                  timeZone={timeZone}
                  professionals={visibleProfessionals}
                  appointments={visibleAppointments}
                  businessHours={businessHours}
                  nowMinutes={isSameDate(date, today) ? minutesOfDay(today) : null}
                  freeFromMinutes={freeFromMinutes}
                  onOpen={openAppointment}
                  onCreateAt={(professionalId, minutes) => createAt(date, minutes, professionalId)}
                  canMove={canMove}
                  onMove={(appointmentId, professionalId, minutes) => moveAppointment(appointmentId, date, minutes, professionalId)}
                />
              )}
              {params.view === 'week' && (
                <WeekView
                  businessId={businessId}
                  days={days}
                  today={today}
                  timeZone={timeZone}
                  professionals={visibleProfessionals}
                  appointments={visibleAppointments}
                  businessHours={businessHours}
                  nowMinutes={minutesOfDay(today)}
                  onOpen={openAppointment}
                  onOpenDay={openDay}
                  canMove={canMove}
                  onMove={(appointmentId, dayKey, minutes) => {
                    const day = days.find((candidate) => candidate.toISOString() === dayKey);
                    if (day) moveAppointment(appointmentId, day, minutes);
                  }}
                  onCreateAt={(day, minutes) =>
                    createAt(day, minutes, visibleProfessionals.length === 1 ? visibleProfessionals[0]?.id : undefined)
                  }
                />
              )}
              {params.view === 'month' && (
                <MonthView
                  days={days}
                  month={date}
                  today={today}
                  timeZone={timeZone}
                  appointments={visibleAppointments}
                  onOpen={openAppointment}
                  onOpenDay={openDay}
                />
              )}
            </div>

            <div className={cn('md:hidden', params.view === 'board' && 'hidden')}>
              <AppointmentList
                days={days.filter((day) => params.view !== 'month' || day.getMonth() === date.getMonth())}
                timeZone={timeZone}
                appointments={visibleAppointments}
                showProfessional={visibleProfessionals.length > 1}
                onOpen={openAppointment}
              />
            </div>
          </>
        )}
      </div>

      <AppointmentSheet
        businessId={businessId}
        appointmentId={params.appointment}
        timeZone={timeZone}
        professionals={scope.professionals}
        canActOn={scope.canActOn}
        onClose={() => void setParams({ appointment: null })}
      />
      <NewAppointmentSheet
        businessId={businessId}
        timeZone={timeZone}
        professionals={scope.professionals}
        prefill={newAppointment}
        onClose={() => setNewAppointment(null)}
        onCreated={(appointmentId) => {
          setNewAppointment(null);
          openAppointment(appointmentId);
        }}
      />
    </div>
  );
}

const VIEW_ITEMS = APPOINTMENT_VIEWS.map((view) => ({ value: view, label: APPOINTMENT_VIEW_LABELS[view] }));

type ViewSwitcherProps = {
  view: AppointmentView;
  onChange: (view: AppointmentView) => void;
};

function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  return (
    <>
      <ToggleGroup
        aria-label="Visualização"
        variant="outline"
        spacing={0}
        className="max-lg:hidden"
        value={[view]}
        onValueChange={([next]) => {
          if (isAppointmentView(next)) onChange(next);
        }}
      >
        {VIEW_ITEMS.map((item) => (
          <ToggleGroupItem key={item.value} value={item.value} className="px-3">
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Select
        items={VIEW_ITEMS}
        value={view}
        onValueChange={(next) => {
          if (isAppointmentView(next)) onChange(next);
        }}
      >
        <SelectTrigger aria-label="Visualização" className="lg:hidden">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {VIEW_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}

export { AppointmentsPage as Component };
