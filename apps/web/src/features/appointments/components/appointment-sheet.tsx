import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Separator } from '@packages/ui/components/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@packages/ui/components/sheet';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { Textarea } from '@packages/ui/components/textarea';
import { cn } from '@packages/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { CalendarClockIcon, ListChecksIcon, PencilIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router';
import { customerPath } from '@/features/customers';
import type { Professional } from '@/features/professionals';
import { formatCurrency } from '@/shared/lib/format-currency';
import { useNow } from '@/shared/hooks/use-now';
import { useChangeAppointmentStatus, useUpdateAppointment } from '../api/appointments.mutations';
import { appointmentQueries } from '../api/appointments.queries';
import {
  isOpen,

  STATUS_DOT_CLASSES,
  STATUS_LABELS,
  statusActions,
  type StatusAction,
} from '../appointment-status';
import { formatDayHeading, formatTime, toZoned } from '../calendar';
import { AppointmentStatus, type Appointment } from '../types';
import { AppointmentPayments } from './appointment-payments';
import { CancelAppointmentDialog } from './cancel-appointment-dialog';
import { ChangeServicesDialog } from './change-services-dialog';
import { RescheduleDialog } from './reschedule-dialog';

type AppointmentSheetProps = {
  businessId: string;
  appointmentId: string | null;
  timeZone: string;
  professionals: Professional[];
  canActOn: (appointment: Appointment) => boolean;
  onClose: () => void;
};

export function AppointmentSheet({
  businessId,
  appointmentId,
  timeZone,
  professionals,
  canActOn,
  onClose,
}: AppointmentSheetProps) {
  const { data: appointment, isPending } = useQuery({
    ...appointmentQueries.detail(businessId, appointmentId ?? ''),
    enabled: Boolean(appointmentId),
  });

  return (
    <Sheet open={appointmentId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {appointment ? (
          <AppointmentDetails
            businessId={businessId}
            appointment={appointment}
            timeZone={timeZone}
            professionals={professionals}
            canAct={canActOn(appointment)}
          />
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>Agendamento</SheetTitle>
              <SheetDescription>{isPending ? 'Carregando…' : 'Não foi possível carregar o agendamento.'}</SheetDescription>
            </SheetHeader>
            {isPending && (
              <div className="flex justify-center py-10">
                <Spinner className="size-6" />
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

type AppointmentDetailsProps = {
  businessId: string;
  appointment: Appointment;
  timeZone: string;
  professionals: Professional[];
  canAct: boolean;
};

function AppointmentDetails({ businessId, appointment, timeZone, professionals, canAct }: AppointmentDetailsProps) {
  const now = useNow();
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const changeStatus = useChangeAppointmentStatus(businessId);
  const start = toZoned(appointment.startAt, timeZone);
  const end = toZoned(appointment.endAt, timeZone);
  const actions = canAct ? statusActions(appointment, now) : [];
  const canReschedule = canAct && isOpen(appointment);
  const canChangeServices = canReschedule && appointment.package === null;
  const [isServicesOpen, setIsServicesOpen] = useState(false);

  const runAction = (action: StatusAction) => {
    if (action.status === AppointmentStatus.CANCELLED) {
      setIsCancelOpen(true);
      return;
    }
    changeStatus.mutate(
      { appointmentId: appointment.id, status: action.status },
      { onSuccess: (updated) => toast.success(`Agendamento ${STATUS_LABELS[updated.status].toLowerCase()}.`) },
    );
  };

  return (
    <>
      <SheetHeader className="gap-2 border-b">
        <Badge variant="outline" className="gap-1.5">
          <span className={cn('size-2 rounded-full', STATUS_DOT_CLASSES[appointment.status])} />
          {STATUS_LABELS[appointment.status]}
        </Badge>
        <SheetTitle className="text-lg">
          <Link to={customerPath(businessId, appointment.customer.id)} className="hover:underline">
            {appointment.customer.name}
          </Link>
        </SheetTitle>
        <SheetDescription className="first-letter:uppercase">
          {formatDayHeading(start)}, {formatTime(start)} às {formatTime(end)}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        <DetailSection title="Profissional">{appointment.professional.name}</DetailSection>

        <DetailSection title={appointment.package ? `Pacote: ${appointment.package.name}` : 'Serviços'}>
          <ul className="flex flex-col gap-1.5">
            {appointment.services.map((line) => (
              <li key={line.serviceId} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  {line.name} <span className="text-muted-foreground">· {line.durationMinutes} min</span>
                </span>
                <span className="shrink-0 tabular-nums">{formatCurrency(line.price)}</span>
              </li>
            ))}
          </ul>
          {canChangeServices && (
            <Button type="button" variant="ghost" size="sm" className="-ml-2 mt-1" onClick={() => setIsServicesOpen(true)}>
              <ListChecksIcon />
              Trocar serviços
            </Button>
          )}
        </DetailSection>

        <AppointmentPayments businessId={businessId} appointment={appointment} timeZone={timeZone} canAct={canAct} />

        {appointment.cancellationReason && (
          <DetailSection title="Motivo do cancelamento">{appointment.cancellationReason}</DetailSection>
        )}
        {appointment.customerNotes && (
          <DetailSection title="Observação do cliente">
            <span className="whitespace-pre-line">{appointment.customerNotes}</span>
          </DetailSection>
        )}
        {(appointment.internalNotes || canAct) && (
          <InternalNotes businessId={businessId} appointment={appointment} canEdit={canAct} />
        )}

        {appointment.history && appointment.history.length > 0 && (
          <>
            <Separator />
            <DetailSection title="Histórico">
              <ol className="flex flex-col gap-2">
                {appointment.history.map((change) => (
                  <li key={change.changedAt} className="flex gap-2.5">
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', STATUS_DOT_CLASSES[change.newStatus])} />
                    <span className="flex min-w-0 flex-col">
                      <span>
                        {change.previousStatus ? STATUS_LABELS[change.newStatus] : 'Agendado'}
                        {change.changedByName && <span className="text-muted-foreground"> por {change.changedByName}</span>}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(toZoned(change.changedAt, timeZone), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {change.reason && <span className="text-xs text-muted-foreground">“{change.reason}”</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </DetailSection>
          </>
        )}
      </div>

      {(actions.length > 0 || canReschedule) && (
        <SheetFooter className="border-t">
          <div className="flex flex-wrap gap-2">
            {canReschedule && (
              <Button type="button" variant="outline" onClick={() => setIsRescheduleOpen(true)}>
                <CalendarClockIcon />
                Remarcar
              </Button>
            )}
            {actions.map((action) => (
              <Button
                key={action.status}
                type="button"
                variant={
                  action.status === AppointmentStatus.CANCELLED || action.status === AppointmentStatus.NO_SHOW
                    ? 'outline'
                    : 'default'
                }
                disabled={changeStatus.isPending || action.availableFrom !== null}
                onClick={() => runAction(action)}
              >
                {changeStatus.isPending && changeStatus.variables.status === action.status && <Spinner />}
                {action.label}
              </Button>
            ))}
          </div>
          {actions.some(({ availableFrom }) => availableFrom !== null) && (
            <p className="text-xs text-muted-foreground">
              Iniciar, concluir e marcar falta ficam disponíveis a partir das {formatTime(start)}.
            </p>
          )}
        </SheetFooter>
      )}

      <CancelAppointmentDialog
        businessId={businessId}
        appointment={appointment}
        open={isCancelOpen}
        onOpenChange={setIsCancelOpen}
      />
      {canChangeServices && (
        <ChangeServicesDialog
          businessId={businessId}
          appointment={appointment}
          professional={professionals.find(({ id }) => id === appointment.professional.id)}
          open={isServicesOpen}
          onOpenChange={setIsServicesOpen}
        />
      )}
      {canReschedule && (
        <RescheduleDialog
          businessId={businessId}
          timeZone={timeZone}
          appointment={appointment}
          professionals={professionals}
          open={isRescheduleOpen}
          onOpenChange={setIsRescheduleOpen}
        />
      )}
    </>
  );
}

const NOTES_MAX_LENGTH = 1000;

type InternalNotesProps = {
  businessId: string;
  appointment: Appointment;
  canEdit: boolean;
};

function InternalNotes({ businessId, appointment, canEdit }: InternalNotesProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const updateAppointment = useUpdateAppointment(businessId);

  const save = () => {
    if (draft === null) return;
    updateAppointment.mutate(
      { appointmentId: appointment.id, internalNotes: draft.trim() || null },
      {
        onSuccess: () => {
          toast.success('Observação salva.');
          setDraft(null);
        },
      },
    );
  };

  if (draft !== null) {
    return (
      <DetailSection title="Observação interna">
        <Textarea
          aria-label="Observação interna"
          rows={3}
          maxLength={NOTES_MAX_LENGTH}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={updateAppointment.isPending} onClick={() => setDraft(null)}>
            Cancelar
          </Button>
          <Button type="button" size="sm" disabled={updateAppointment.isPending} onClick={save}>
            {updateAppointment.isPending && <Spinner />}
            Salvar
          </Button>
        </div>
      </DetailSection>
    );
  }

  return (
    <DetailSection title="Observação interna">
      <div className="flex items-start justify-between gap-3">
        {appointment.internalNotes ? (
          <span className="whitespace-pre-line">{appointment.internalNotes}</span>
        ) : (
          <span className="text-muted-foreground">Nenhuma. Só a equipe vê.</span>
        )}
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Editar observação interna"
            onClick={() => setDraft(appointment.internalNotes ?? '')}
          >
            <PencilIcon />
          </Button>
        )}
      </div>
    </DetailSection>
  );
}

type DetailSectionProps = {
  title: string;
  children: ReactNode;
};

function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <section className="flex flex-col gap-1.5 text-sm">
      <h3 className="text-xs font-medium text-muted-foreground uppercase">{title}</h3>
      <div>{children}</div>
    </section>
  );
}
