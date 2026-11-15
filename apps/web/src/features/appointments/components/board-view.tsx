import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { Spinner } from '@packages/ui/components/spinner';
import { toast } from '@packages/ui/components/sonner';
import { cn } from '@packages/ui/lib/utils';
import { CircleDollarSignIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNow } from '@/shared/hooks/use-now';
import { useChangeAppointmentStatus } from '../api/appointments.mutations';
import { servicesSummary, STATUS_DOT_CLASSES, STATUS_LABELS, statusActions } from '../appointment-status';
import { formatTime, toZoned } from '../calendar';
import { AppointmentPaymentStatus, AppointmentStatus, type Appointment } from '../types';
import { CancelAppointmentDialog } from './cancel-appointment-dialog';

const BOARD_COLUMNS: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.IN_PROGRESS,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.NO_SHOW,
  AppointmentStatus.CANCELLED,
];

const screenReaderInstructions = {
  draggable:
    'Para mudar o status, pressione espaço ou enter, use as setas para escolher a coluna e pressione espaço ou enter de novo. Esc cancela.',
};

type BoardViewProps = {
  businessId: string;
  timeZone: string;
  appointments: Appointment[];
  showCancelled: boolean;
  showProfessional: boolean;
  canActOn: (appointment: Appointment) => boolean;
  onOpen: (appointmentId: string) => void;
};

export function BoardView({
  businessId,
  timeZone,
  appointments,
  showCancelled,
  showProfessional,
  canActOn,
  onOpen,
}: BoardViewProps) {
  const now = useNow();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );
  const changeStatus = useChangeAppointmentStatus(businessId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ id: string; status: AppointmentStatus } | null>(null);
  const [cancelling, setCancelling] = useState<Appointment | null>(null);

  const byId = new Map(appointments.map((appointment) => [appointment.id, appointment]));
  const active = activeId ? byId.get(activeId) : undefined;
  const allowedTargets = active && canActOn(active)
    ? statusActions(active, now).filter(({ availableFrom }) => availableFrom === null).map(({ status }) => status)
    : [];
  const columns = BOARD_COLUMNS.filter((status) => showCancelled || status !== AppointmentStatus.CANCELLED);
  const statusOf = (appointment: Appointment) =>
    pendingMove?.id === appointment.id ? pendingMove.status : appointment.status;

  const nameOf = (id: UniqueIdentifier) => {
    const appointment = byId.get(String(id));
    if (appointment) return `${formatTime(toZoned(appointment.startAt, timeZone))} ${appointment.customer.name}`;
    const column = BOARD_COLUMNS.find((status) => status === id);
    return column ? STATUS_LABELS[column] : '';
  };
  const announcements: Announcements = {
    onDragStart: ({ active: item }) => `${nameOf(item.id)} selecionado.`,
    onDragOver: ({ active: item, over }) => (over ? `${nameOf(item.id)} sobre ${nameOf(over.id)}.` : ''),
    onDragEnd: ({ active: item, over }) => (over ? `${nameOf(item.id)} solto em ${nameOf(over.id)}.` : ''),
    onDragCancel: ({ active: item }) => `Movimento de ${nameOf(item.id)} cancelado.`,
  };

  const handleDragStart = ({ active: item }: DragStartEvent) => setActiveId(String(item.id));

  const handleDragEnd = ({ active: item, over }: DragEndEvent) => {
    setActiveId(null);
    const appointment = byId.get(String(item.id));
    const target = BOARD_COLUMNS.find((status) => status === over?.id);
    if (!appointment || !target || !allowedTargets.includes(target)) return;

    if (target === AppointmentStatus.CANCELLED) {
      setCancelling(appointment);
      return;
    }
    setPendingMove({ id: appointment.id, status: target });
    changeStatus.mutate(
      { appointmentId: appointment.id, status: target },
      {
        onSuccess: () => toast.success(`${appointment.customer.name}: ${STATUS_LABELS[target].toLowerCase()}.`),
        onSettled: () => setPendingMove(null),
      },
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full gap-3 overflow-x-auto pb-2">
        {columns.map((status) => {
          const items = appointments.filter((appointment) => statusOf(appointment) === status);
          return (
            <BoardColumn
              key={status}
              status={status}
              count={items.length}
              isDragging={active !== undefined}
              isAllowed={allowedTargets.includes(status)}
              isSource={active !== undefined && statusOf(active) === status}
            >
              {items.map((appointment) => (
                <DraggableCard
                  key={appointment.id}
                  appointment={appointment}
                  disabled={!canActOn(appointment) || pendingMove !== null}
                  isMoving={pendingMove?.id === appointment.id}
                  timeZone={timeZone}
                  showProfessional={showProfessional}
                  onOpen={() => onOpen(appointment.id)}
                />
              ))}
            </BoardColumn>
          );
        })}
      </div>

      <DragOverlay>
        {active && <BoardCard appointment={active} timeZone={timeZone} showProfessional={showProfessional} isOverlay />}
      </DragOverlay>

      {cancelling && (
        <CancelAppointmentDialog
          businessId={businessId}
          appointment={cancelling}
          open
          onOpenChange={(open) => !open && setCancelling(null)}
        />
      )}
    </DndContext>
  );
}

type BoardColumnProps = {
  status: AppointmentStatus;
  count: number;
  isDragging: boolean;
  isAllowed: boolean;
  isSource: boolean;
  children: ReactNode;
};

function BoardColumn({ status, count, isDragging, isAllowed, isSource, children }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: !isAllowed });

  return (
    <section
      ref={setNodeRef}
      aria-label={STATUS_LABELS[status]}
      className={cn(
        'flex h-full min-h-64 w-64 shrink-0 flex-col gap-2 rounded-[min(var(--radius-4xl),24px)] bg-muted p-2.5 transition-[opacity,box-shadow]',
        isDragging && !isAllowed && !isSource && 'opacity-40',
        isDragging && isAllowed && 'ring-2 ring-primary/30',
        isOver && 'ring-primary/70 bg-primary/5',
      )}
    >
      <header className="flex items-center gap-2 px-1.5 pt-0.5">
        <span className={cn('size-2 rounded-full', STATUS_DOT_CLASSES[status])} />
        <h2 className="truncate text-sm font-medium">{STATUS_LABELS[status]}</h2>
        <span className="text-sm text-muted-foreground">{count}</span>
      </header>
      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-1 pb-1">{children}</div>
    </section>
  );
}

type DraggableCardProps = {
  appointment: Appointment;
  disabled: boolean;
  isMoving: boolean;
  timeZone: string;
  showProfessional: boolean;
  onOpen: () => void;
};

function DraggableCard({ appointment, disabled, isMoving, timeZone, showProfessional, onOpen }: DraggableCardProps) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: appointment.id, disabled });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={cn(
        'rounded-2xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
        !disabled && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-30',
      )}
    >
      <BoardCard appointment={appointment} timeZone={timeZone} showProfessional={showProfessional} isMoving={isMoving} />
    </button>
  );
}

type BoardCardProps = {
  appointment: Appointment;
  timeZone: string;
  showProfessional: boolean;
  isOverlay?: boolean;
  isMoving?: boolean;
};

function BoardCard({ appointment, timeZone, showProfessional, isOverlay = false, isMoving = false }: BoardCardProps) {
  const start = toZoned(appointment.startAt, timeZone);
  const end = toZoned(appointment.endAt, timeZone);
  const owesPayment =
    appointment.status === AppointmentStatus.COMPLETED && appointment.paymentStatus !== AppointmentPaymentStatus.PAID;

  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-2xl border bg-card p-3 text-sm shadow-xs',
        isOverlay && 'rotate-1 shadow-lg',
      )}
    >
      <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground tabular-nums">
        {formatTime(start)}–{formatTime(end)}
        {isMoving && <Spinner className="size-3.5" />}
        {!isMoving && owesPayment && <CircleDollarSignIcon className="size-3.5 text-amber-600" aria-label="Pagamento pendente" />}
      </span>
      <span className="truncate font-medium">{appointment.customer.name}</span>
      <span className="truncate text-muted-foreground">{servicesSummary(appointment)}</span>
      {showProfessional && <span className="truncate text-xs text-muted-foreground">{appointment.professional.name}</span>}
    </div>
  );
}
