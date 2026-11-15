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
import { Field, FieldDescription, FieldLabel } from '@packages/ui/components/field';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { Textarea } from '@packages/ui/components/textarea';
import { useState } from 'react';
import { useChangeAppointmentStatus } from '../api/appointments.mutations';
import { AppointmentStatus, type Appointment } from '../types';

const REASON_MAX_LENGTH = 1000;

type CancelAppointmentDialogProps = {
  businessId: string;
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CancelAppointmentDialog({ businessId, appointment, open, onOpenChange }: CancelAppointmentDialogProps) {
  const [reason, setReason] = useState('');
  const changeStatus = useChangeAppointmentStatus(businessId);

  const confirm = () =>
    changeStatus.mutate(
      { appointmentId: appointment.id, status: AppointmentStatus.CANCELLED, reason: reason.trim() || null },
      {
        onSuccess: () => {
          toast.success('Agendamento cancelado.');
          setReason('');
          onOpenChange(false);
        },
      },
    );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar o agendamento de {appointment.customer.name}?</AlertDialogTitle>
          <AlertDialogDescription>O horário fica livre na agenda e o cliente recebe o aviso.</AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="cancel-reason">
            Motivo <span className="font-normal text-muted-foreground">(opcional)</span>
          </FieldLabel>
          <Textarea
            id="cancel-reason"
            rows={3}
            maxLength={REASON_MAX_LENGTH}
            value={reason}
            placeholder="Ex.: Profissional precisou se ausentar."
            onChange={(event) => setReason(event.target.value)}
          />
          <FieldDescription>O cliente vê o motivo no aviso de cancelamento.</FieldDescription>
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={changeStatus.isPending}>Voltar</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={changeStatus.isPending} onClick={confirm}>
            {changeStatus.isPending && <Spinner />}
            Cancelar agendamento
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
