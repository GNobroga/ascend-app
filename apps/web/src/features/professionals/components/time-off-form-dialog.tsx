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
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@packages/ui/components/select';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { Switch } from '@packages/ui/components/switch';
import { Textarea } from '@packages/ui/components/textarea';
import { CircleAlertIcon } from 'lucide-react';
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form';
import { useBusinessTimezone } from '@/features/businesses';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { useCreateTimeOff, useUpdateTimeOff } from '../api/professionals.mutations';
import { timeOffSchema, type TimeOffValues } from '../schemas';
import { TIME_OFF_TYPE_OPTIONS, TIME_OFF_TYPES, toTimeOffFormValues, toTimeOffRequest } from '../time-offs';
import type { ProfessionalTimeOff, ProfessionalTimeOffType } from '../types';

const isTimeOffType = (value: unknown): value is ProfessionalTimeOffType =>
  TIME_OFF_TYPES.some((type) => type === value);

type TimeOffFormDialogProps = {
  businessId: string;
  professionalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeOff?: ProfessionalTimeOff;
};

export function TimeOffFormDialog({ businessId, professionalId, open, onOpenChange, timeOff }: TimeOffFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{timeOff ? 'Editar ausência' : 'Nova ausência'}</DialogTitle>
          <DialogDescription>Durante a ausência, a agenda não oferece horários com este profissional.</DialogDescription>
        </DialogHeader>
        {open && (
          <TimeOffForm
            key={timeOff?.id ?? 'new'}
            businessId={businessId}
            professionalId={professionalId}
            timeOff={timeOff}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type TimeOffFormProps = {
  businessId: string;
  professionalId: string;
  timeOff?: ProfessionalTimeOff;
  onDone: () => void;
};

function TimeOffForm({ businessId, professionalId, timeOff, onDone }: TimeOffFormProps) {
  const timeZone = useBusinessTimezone(businessId);
  const form = useForm<TimeOffValues>({
    resolver: zodResolver(timeOffSchema),
    defaultValues: toTimeOffFormValues(timeZone, timeOff),
  });
  const { errors } = useFormState({ control: form.control });
  const allDay = useWatch({ control: form.control, name: 'allDay' });

  const handleError = (error: Error) => {
    if (hasErrorCode(error, ErrorCode.VALIDATION_ERROR)) {
      form.setError('root.server', { message: error.details[0]?.message ?? error.message });
      return;
    }
    applyApiErrors(form, error);
  };
  const createTimeOff = useCreateTimeOff(businessId, professionalId, { onError: handleError });
  const updateTimeOff = useUpdateTimeOff(businessId, professionalId, { onError: handleError });
  const isPending = createTimeOff.isPending || updateTimeOff.isPending;

  const onSubmit = form.handleSubmit((values) => {
    const body = toTimeOffRequest(values, timeZone);
    if (timeOff) {
      updateTimeOff.mutate(
        { timeOffId: timeOff.id, body },
        {
          onSuccess: () => {
            toast.success('Ausência atualizada.');
            onDone();
          },
        },
      );
      return;
    }
    createTimeOff.mutate(body, {
      onSuccess: () => {
        toast.success('Ausência registrada.');
        onDone();
      },
    });
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
          name="type"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="time-off-type">Motivo da ausência</FieldLabel>
              <Select
                items={TIME_OFF_TYPE_OPTIONS}
                value={field.value}
                onValueChange={(value) => {
                  if (isTimeOffType(value)) field.onChange(value);
                }}
              >
                <SelectTrigger
                  ref={field.ref}
                  id="time-off-type"
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                  onBlur={field.onBlur}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OFF_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
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
          name="allDay"
          render={({ field }) => (
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="time-off-all-day">Dia inteiro</FieldLabel>
                <FieldDescription>Desligue para marcar só algumas horas, como uma consulta.</FieldDescription>
              </FieldContent>
              <Switch id="time-off-all-day" checked={field.value} onCheckedChange={field.onChange} />
            </Field>
          )}
        />

        <div className="grid grid-cols-2 gap-x-3 gap-y-6">
          <Controller
            control={form.control}
            name="startDate"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="time-off-start-date">{allDay ? 'Primeiro dia' : 'Início'}</FieldLabel>
                <Input
                  {...field}
                  id="time-off-start-date"
                  type="date"
                  aria-invalid={fieldState.invalid}
                  onChange={(event) => {
                    field.onChange(event);
                    const endDate = form.getValues('endDate');
                    if (event.target.value && (!endDate || endDate < event.target.value)) {
                      form.setValue('endDate', event.target.value);
                    }
                  }}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          {!allDay && (
            <Controller
              control={form.control}
              name="startTime"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="time-off-start-time">Horário de início</FieldLabel>
                  <Input {...field} id="time-off-start-time" type="time" aria-invalid={fieldState.invalid} />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          )}

          <Controller
            control={form.control}
            name="endDate"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="time-off-end-date">{allDay ? 'Último dia' : 'Fim'}</FieldLabel>
                <Input {...field} id="time-off-end-date" type="date" aria-invalid={fieldState.invalid} />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          {!allDay && (
            <Controller
              control={form.control}
              name="endTime"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="time-off-end-time">Horário de fim</FieldLabel>
                  <Input {...field} id="time-off-end-time" type="time" aria-invalid={fieldState.invalid} />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          )}
        </div>

        <Controller
          control={form.control}
          name="reason"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="time-off-reason">
                Observação <span className="font-normal text-muted-foreground">(opcional)</span>
              </FieldLabel>
              <Textarea
                {...field}
                id="time-off-reason"
                rows={2}
                placeholder="Ex.: Férias de fim de ano"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner />}
          {timeOff ? 'Salvar alterações' : 'Registrar ausência'}
        </Button>
      </DialogFooter>
    </form>
  );
}
