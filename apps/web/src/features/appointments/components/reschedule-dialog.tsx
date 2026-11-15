import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@packages/ui/components/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@packages/ui/components/select';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { useQuery } from '@tanstack/react-query';
import { CircleAlertIcon } from 'lucide-react';
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form';
import { BusinessMemberStatus } from '@/features/businesses';
import { catalogQueries } from '@/features/catalog';
import type { Professional } from '@/features/professionals';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { useUpdateAppointment } from '../api/appointments.mutations';
import { appointmentQueries } from '../api/appointments.queries';
import { isProfessionalApt, toStartAt, type BookingSelection } from '../booking';
import { formatTime, toDateKey, toZoned } from '../calendar';
import { rescheduleSchema, type RescheduleValues } from '../schemas';
import type { Appointment } from '../types';
import { TimeSlots } from './time-slots';

type RescheduleDialogProps = {
  businessId: string;
  timeZone: string;
  appointment: Appointment;
  professionals: Professional[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RescheduleDialog({
  businessId,
  timeZone,
  appointment,
  professionals,
  open,
  onOpenChange,
}: RescheduleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remarcar {appointment.customer.name}</DialogTitle>
          <DialogDescription>Os serviços e a duração continuam os mesmos. O cliente recebe o aviso.</DialogDescription>
        </DialogHeader>
        {open && (
          <RescheduleForm
            businessId={businessId}
            timeZone={timeZone}
            appointment={appointment}
            professionals={professionals}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type RescheduleFormProps = {
  businessId: string;
  timeZone: string;
  appointment: Appointment;
  professionals: Professional[];
  onDone: () => void;
};

function RescheduleForm({ businessId, timeZone, appointment, professionals, onDone }: RescheduleFormProps) {
  const start = toZoned(appointment.startAt, timeZone);
  const form = useForm<RescheduleValues>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: {
      professionalId: appointment.professional.id,
      date: toDateKey(start),
      time: formatTime(start),
    },
  });
  const { errors } = useFormState({ control: form.control });
  const [professionalId, date, time] = useWatch({ control: form.control, name: ['professionalId', 'date', 'time'] });

  const { data: packages = [] } = useQuery(catalogQueries.packages(businessId));
  const selection: BookingSelection = appointment.package
    ? { packageId: appointment.package.id }
    : { serviceIds: appointment.services.map(({ serviceId }) => serviceId) };
  const aptProfessionals = professionals.filter(
    (professional) =>
      professional.id === appointment.professional.id ||
      (professional.memberStatus === BusinessMemberStatus.ACTIVE && isProfessionalApt(professional, packages, selection)),
  );

  const availability = useQuery({
    ...appointmentQueries.availability(businessId, { date, professionalId, ...selection }),
    enabled: Boolean(professionalId) && /^\d{4}-\d{2}-\d{2}$/.test(date),
  });
  const slots = (availability.data?.slots ?? []).map((slot) => formatTime(toZoned(slot.startAt, timeZone)));

  const updateAppointment = useUpdateAppointment(businessId, {
    onError: (error) => {
      if (hasErrorCode(error, ErrorCode.APPOINTMENT_SLOT_UNAVAILABLE)) {
        form.setError('time', { message: 'Esse horário não está livre ou não cabe no expediente. Escolha outro.' });
        return;
      }
      applyApiErrors(form, error);
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    updateAppointment.mutate(
      {
        appointmentId: appointment.id,
        startAt: toStartAt(values.date, values.time, timeZone),
        professionalId: values.professionalId === appointment.professional.id ? undefined : values.professionalId,
      },
      {
        onSuccess: () => {
          toast.success('Agendamento remarcado.');
          onDone();
        },
      },
    );
  });

  const serverError = errors.root?.server?.message;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        {serverError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Controller
          control={form.control}
          name="professionalId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="reschedule-professional">Profissional</FieldLabel>
              <Select
                items={aptProfessionals.map(({ id, displayName }) => ({ value: id, label: displayName }))}
                value={field.value || null}
                onValueChange={(value) => {
                  field.onChange(typeof value === 'string' ? value : '');
                  form.setValue('time', '');
                }}
              >
                <SelectTrigger id="reschedule-professional" ref={field.ref} className="w-full" aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Escolha o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {aptProfessionals.map((professional) => (
                    <SelectItem key={professional.id} value={professional.id}>
                      {professional.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="date"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="reschedule-date">Dia</FieldLabel>
              <Input
                {...field}
                id="reschedule-date"
                type="date"
                className="sm:w-48"
                aria-invalid={fieldState.invalid}
                onChange={(event) => {
                  field.onChange(event);
                  form.setValue('time', '');
                }}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="time"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="reschedule-time">Horário</FieldLabel>
              <TimeSlots
                isReady={Boolean(professionalId)}
                isLoading={availability.isFetching}
                slots={slots}
                value={time}
                notReadyMessage="Escolha o profissional para ver os horários livres."
                onSelect={field.onChange}
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Encaixe às</span>
                <Input
                  id="reschedule-time"
                  type="time"
                  className="w-32"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  aria-invalid={fieldState.invalid}
                />
              </div>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={updateAppointment.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={updateAppointment.isPending}>
          {updateAppointment.isPending && <Spinner />}
          Remarcar
        </Button>
      </DialogFooter>
    </form>
  );
}
