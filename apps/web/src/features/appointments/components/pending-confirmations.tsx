import { TZDate } from '@date-fns/tz';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@packages/ui/components/alert';
import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/components/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@packages/ui/components/sheet';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { useQuery } from '@tanstack/react-query';
import { addDays, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarCheckIcon, CalendarClockIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useBusinessTimezone } from '@/features/businesses';
import { useNow } from '@/shared/hooks/use-now';
import { useChangeAppointmentStatus } from '../api/appointments.mutations';
import { appointmentQueries } from '../api/appointments.queries';
import { servicesSummary } from '../appointment-status';
import { toDateKey, toZoned } from '../calendar';
import { useAppointmentScope } from '../hooks/use-appointment-scope';
import { appointmentLink } from '../links';
import { AppointmentStatus } from '../types';

const LOOKAHEAD_DAYS = 30;

const MAX_ITEMS = 8;

const DESCRIPTION = 'Agendamentos online que ainda precisam do seu ok.';

function usePendingConfirmations(businessId: string) {
  const timeZone = useBusinessTimezone(businessId);
  const scope = useAppointmentScope(businessId);
  const now = useNow();
  const today = startOfDay(new TZDate(now, timeZone));
  const range = { from: today.toISOString(), to: addDays(today, LOOKAHEAD_DAYS).toISOString() };
  const { data = [] } = useQuery(appointmentQueries.pending(businessId, range));

  return data.filter(
    (appointment) =>
      new Date(appointment.endAt).getTime() > now &&
      (scope.canManage || appointment.professional.id === scope.viewerProfessionalId),
  );
}

type PendingConfirmationsProps = {
  businessId: string;
};

export function PendingConfirmations({ businessId }: PendingConfirmationsProps) {
  const pending = usePendingConfirmations(businessId);
  if (pending.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Aguardando confirmação
          <Badge variant="secondary">{pending.length}</Badge>
        </CardTitle>
        <CardDescription>{DESCRIPTION}</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <PendingList businessId={businessId} pending={pending} />
      </CardContent>
    </Card>
  );
}

export function PendingConfirmationsBanner({ businessId }: PendingConfirmationsProps) {
  const pending = usePendingConfirmations(businessId);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {pending.length > 0 && (
        <Alert>
          <CalendarClockIcon />
          <AlertTitle>
            {pending.length === 1
              ? '1 agendamento aguardando confirmação'
              : `${pending.length} agendamentos aguardando confirmação`}
          </AlertTitle>
          <AlertDescription>{DESCRIPTION}</AlertDescription>
          <AlertAction>
            <Button type="button" size="sm" onClick={() => setIsOpen(true)}>
              Revisar
            </Button>
          </AlertAction>
        </Alert>
      )}

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full gap-0 sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle>Aguardando confirmação</SheetTitle>
            <SheetDescription>{DESCRIPTION}</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto py-3">
            {pending.length === 0 ? (
              <p className="flex items-center gap-2 px-6 text-sm text-muted-foreground">
                <CalendarCheckIcon className="size-4" />
                Tudo confirmado.
              </p>
            ) : (
              <PendingList businessId={businessId} pending={pending} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

type PendingListProps = {
  businessId: string;
  pending: ReturnType<typeof usePendingConfirmations>;
};

function PendingList({ businessId, pending }: PendingListProps) {
  const timeZone = useBusinessTimezone(businessId);
  const scope = useAppointmentScope(businessId);
  const now = useNow();
  const changeStatus = useChangeAppointmentStatus(businessId);
  const todayKey = toDateKey(startOfDay(new TZDate(now, timeZone)));

  return (
    <>
      <ul className="flex flex-col divide-y">
        {pending.slice(0, MAX_ITEMS).map((appointment) => {
          const start = toZoned(appointment.startAt, timeZone);
          const isConfirming = changeStatus.isPending && changeStatus.variables.appointmentId === appointment.id;
          return (
            <li key={appointment.id} className="flex items-center gap-3 px-6 py-3">
              <Link
                to={appointmentLink(businessId, appointment, timeZone, todayKey)}
                className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                <span className="truncate font-medium">{appointment.customer.name}</span>
                <span className="truncate text-sm text-muted-foreground first-letter:uppercase">
                  {format(start, "EEE, d 'de' MMM 'às' HH:mm", { locale: ptBR })} · {servicesSummary(appointment)}
                </span>
              </Link>
              {scope.canActOn(appointment) && (
                <Button
                  type="button"
                  size="sm"
                  disabled={isConfirming}
                  onClick={() =>
                    changeStatus.mutate(
                      { appointmentId: appointment.id, status: AppointmentStatus.CONFIRMED },
                      { onSuccess: () => toast.success(`${appointment.customer.name} confirmado.`) },
                    )
                  }
                >
                  {isConfirming && <Spinner />}
                  Confirmar
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {pending.length > MAX_ITEMS && (
        <p className="px-6 pt-3 text-sm text-muted-foreground">
          E mais {pending.length - MAX_ITEMS}. Veja todos na agenda, com o filtro de status.
        </p>
      )}
    </>
  );
}
