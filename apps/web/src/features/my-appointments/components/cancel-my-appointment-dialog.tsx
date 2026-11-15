import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@packages/ui/components/alert-dialog';
import { Button } from '@packages/ui/components/button';
import { Field, FieldLabel } from '@packages/ui/components/field';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { Textarea } from '@packages/ui/components/textarea';
import { useState } from 'react';
import { useCancelMyAppointment } from '../api/my-appointments.mutations';
import { formatAppointmentDay, formatTime } from '../format';
import type { MyAppointment } from '../types';

const REASON_MAX_LENGTH = 1000;

type CancelMyAppointmentDialogProps = {
  appointment: MyAppointment | null;
  onOpenChange: (open: boolean) => void;
};

export function CancelMyAppointmentDialog({ appointment, onOpenChange }: CancelMyAppointmentDialogProps) {
  const [reason, setReason] = useState('');
  const cancel = useCancelMyAppointment();

  const close = () => {
    setReason('');
    onOpenChange(false);
  };

  const confirm = () => {
    if (!appointment) return;
    cancel.mutate(
      { appointmentId: appointment.id, reason: reason.trim() || null },
      {
        onSuccess: () => {
          toast.success('Agendamento cancelado.');
          close();
        },
      },
    );
  };

  const timeZone = appointment?.business.timezone ?? 'UTC';

  return (
    <AlertDialog open={appointment !== null} onOpenChange={(open) => !open && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar este agendamento?</AlertDialogTitle>
          {appointment && (
            <AlertDialogDescription>
              {appointment.business.name}, {formatAppointmentDay(appointment.startAt, timeZone)} às{' '}
              {formatTime(appointment.startAt, timeZone)}. O horário fica livre para outra pessoa.
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="my-cancel-reason">
            Motivo <span className="font-normal text-muted-foreground">(opcional)</span>
          </FieldLabel>
          <Textarea
            id="my-cancel-reason"
            rows={3}
            maxLength={REASON_MAX_LENGTH}
            value={reason}
            placeholder="Ex.: Tive um imprevisto."
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancel.isPending}>Voltar</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={cancel.isPending} onClick={confirm}>
            {cancel.isPending && <Spinner />}
            Cancelar agendamento
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
