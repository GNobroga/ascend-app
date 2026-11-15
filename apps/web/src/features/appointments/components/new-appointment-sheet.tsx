import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import { Checkbox } from '@packages/ui/components/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@packages/ui/components/select';
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
import { ToggleGroup, ToggleGroupItem } from '@packages/ui/components/toggle-group';
import { cn } from '@packages/ui/lib/utils';
import { FormSkeleton } from '@packages/ui/components/skeletons';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { CircleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form';
import { BusinessMemberStatus } from '@/features/businesses';
import { catalogQueries } from '@/features/catalog';
import { CustomerFormDialog, type Customer } from '@/features/customers';
import type { Professional } from '@/features/professionals';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { QueryBoundary } from '@/shared/components/query-boundary';
import { formatCurrency } from '@/shared/lib/format-currency';
import { useCreateAppointment } from '../api/appointments.mutations';
import { appointmentQueries } from '../api/appointments.queries';
import { isProfessionalApt, toStartAt, type BookingSelection } from '../booking';
import { formatTime, toZoned } from '../calendar';
import { BOOKING_MODES, newAppointmentSchema, type BookingMode, type NewAppointmentValues } from '../schemas';
import { CustomerPicker } from './customer-picker';
import { TimeSlots } from './time-slots';

export type NewAppointmentPrefill = {
  professionalId?: string;
  date: string;
  time?: string;
};

type NewAppointmentSheetProps = {
  businessId: string;
  timeZone: string;
  professionals: Professional[];
  prefill: NewAppointmentPrefill | null;
  onClose: () => void;
  onCreated: (appointmentId: string) => void;
};

export function NewAppointmentSheet({
  businessId,
  timeZone,
  professionals,
  prefill,
  onClose,
  onCreated,
}: NewAppointmentSheetProps) {
  return (
    <Sheet open={prefill !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>Novo agendamento</SheetTitle>
          <SheetDescription>Agendamentos da equipe já nascem confirmados.</SheetDescription>
        </SheetHeader>
        {prefill && (
          <QueryBoundary
            fallback={
              <div className="p-4">
                <FormSkeleton fields={5} />
              </div>
            }
          >
            <NewAppointmentForm
              key={`${prefill.professionalId ?? ''}-${prefill.date}-${prefill.time ?? ''}`}
              businessId={businessId}
              timeZone={timeZone}
              professionals={professionals}
              prefill={prefill}
              onCreated={onCreated}
              onCancel={onClose}
            />
          </QueryBoundary>
        )}
      </SheetContent>
    </Sheet>
  );
}

const isBookingMode = (value: unknown): value is BookingMode => BOOKING_MODES.some((mode) => mode === value);

const selectionOf = (mode: BookingMode, serviceIds: string[], packageId: string): BookingSelection =>
  mode === 'services' ? { serviceIds } : { packageId };

type NewAppointmentFormProps = {
  businessId: string;
  timeZone: string;
  professionals: Professional[];
  prefill: NewAppointmentPrefill;
  onCreated: (appointmentId: string) => void;
  onCancel: () => void;
};

function NewAppointmentForm({
  businessId,
  timeZone,
  professionals,
  prefill,
  onCreated,
  onCancel,
}: NewAppointmentFormProps) {
  const activeProfessionals = professionals.filter(({ memberStatus }) => memberStatus === BusinessMemberStatus.ACTIVE);
  const [onlyProfessional] = activeProfessionals.length === 1 ? activeProfessionals : [];
  const form = useForm<NewAppointmentValues>({
    resolver: zodResolver(newAppointmentSchema),
    defaultValues: {
      customerId: '',
      mode: 'services',
      serviceIds: [],
      packageId: '',
      professionalId: prefill.professionalId ?? onlyProfessional?.id ?? '',
      date: prefill.date,
      time: prefill.time ?? '',
      internalNotes: '',
    },
  });
  const { errors } = useFormState({ control: form.control });
  const [mode, serviceIds, packageId, professionalId, date, time] = useWatch({
    control: form.control,
    name: ['mode', 'serviceIds', 'packageId', 'professionalId', 'date', 'time'],
  });
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);

  const { data: allServices } = useSuspenseQuery(catalogQueries.services(businessId));
  const { data: allPackages } = useSuspenseQuery(catalogQueries.packages(businessId));
  const services = allServices.filter(({ isActive }) => isActive);
  const packages = allPackages.filter(({ isActive }) => isActive);
  const selectedPackage = packages.find(({ id }) => id === packageId);

  const isApt = (professional: Professional, nextMode: BookingMode, nextServiceIds: string[], nextPackageId: string) =>
    isProfessionalApt(professional, allPackages, selectionOf(nextMode, nextServiceIds, nextPackageId));
  const aptProfessionals = activeProfessionals.filter((professional) => isApt(professional, mode, serviceIds, packageId));

  const hasWhat = mode === 'services' ? serviceIds.length > 0 : Boolean(packageId);
  const availability = useQuery({
    ...appointmentQueries.availability(businessId, {
      date,
      professionalId,
      ...selectionOf(mode, serviceIds, packageId),
    }),
    enabled: hasWhat && Boolean(professionalId) && /^\d{4}-\d{2}-\d{2}$/.test(date),
  });
  const slots = (availability.data?.slots ?? []).map((slot) => formatTime(toZoned(slot.startAt, timeZone)));

  const selectedServices = services.filter(({ id }) => serviceIds.includes(id));
  const durationMinutes =
    mode === 'package'
      ? (selectedPackage?.servicesDurationInMinutes ?? 0)
      : selectedServices.reduce((total, service) => total + service.durationInMinutes, 0);
  const totalPrice =
    mode === 'package'
      ? (selectedPackage?.price ?? 0)
      : selectedServices.reduce((total, service) => total + service.price, 0);

  const resetDependents = (nextMode: BookingMode, nextServiceIds: string[], nextPackageId: string) => {
    const current = activeProfessionals.find(({ id }) => id === form.getValues('professionalId'));
    if (current && !isApt(current, nextMode, nextServiceIds, nextPackageId)) form.setValue('professionalId', '');
    form.setValue('time', '');
  };

  const createAppointment = useCreateAppointment(businessId, {
    onError: (error) => {
      if (hasErrorCode(error, ErrorCode.APPOINTMENT_SLOT_UNAVAILABLE)) {
        form.setError('time', {
          message: 'Esse horário não está mais livre ou não cabe no expediente. Escolha outro.',
        });
        return;
      }
      applyApiErrors(form, error);
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    createAppointment.mutate(
      {
        customerId: values.customerId,
        professionalId: values.professionalId,
        ...(values.mode === 'services' ? { serviceIds: values.serviceIds } : { packageId: values.packageId }),
        startAt: toStartAt(values.date, values.time, timeZone),
        internalNotes: values.internalNotes || null,
      },
      {
        onSuccess: (appointment) => {
          toast.success('Agendamento criado.');
          onCreated(appointment.id);
        },
      },
    );
  });

  const serverError = errors.root?.server?.message;

  return (
    <>
      <form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          <FieldGroup>
            {serverError && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <Controller
              control={form.control}
              name="customerId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="new-appointment-customer">Cliente</FieldLabel>
                  <CustomerPicker
                    businessId={businessId}
                    inputId="new-appointment-customer"
                    selected={customer}
                    invalid={fieldState.invalid}
                    onSelect={(next) => {
                      setCustomer(next);
                      field.onChange(next?.id ?? '');
                    }}
                    onCreate={() => setIsCustomerFormOpen(true)}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            {packages.length > 0 && (
              <ToggleGroup
                aria-label="O que agendar"
                variant="outline"
                spacing={0}
                value={[mode]}
                onValueChange={([next]) => {
                  if (!isBookingMode(next)) return;
                  form.setValue('mode', next);
                  resetDependents(next, serviceIds, packageId);
                }}
              >
                <ToggleGroupItem value="services" className="px-4">
                  Serviços
                </ToggleGroupItem>
                <ToggleGroupItem value="package" className="px-4">
                  Pacote
                </ToggleGroupItem>
              </ToggleGroup>
            )}

            {mode === 'services' ? (
              <Controller
                control={form.control}
                name="serviceIds"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel id="new-appointment-services">Serviços</FieldLabel>
                    <ul
                      aria-labelledby="new-appointment-services"
                      className="flex max-h-64 flex-col divide-y overflow-y-auto rounded-2xl border"
                    >
                      {services.map((service) => {
                        const id = `new-appointment-service-${service.id}`;
                        const checked = field.value.includes(service.id);
                        return (
                          <li key={service.id}>
                            <Field orientation="horizontal" className="px-3 py-2">
                              <Checkbox
                                id={id}
                                checked={checked}
                                onCheckedChange={(next) => {
                                  const nextIds = next
                                    ? [...field.value, service.id]
                                    : field.value.filter((current) => current !== service.id);
                                  field.onChange(nextIds);
                                  resetDependents('services', nextIds, packageId);
                                }}
                              />
                              <FieldLabel htmlFor={id} className="min-w-0 flex-1 justify-between font-normal">
                                <span className="truncate">{service.name}</span>
                                <span className="shrink-0 text-muted-foreground tabular-nums">
                                  {service.durationInMinutes} min · {formatCurrency(service.price)}
                                </span>
                              </FieldLabel>
                            </Field>
                          </li>
                        );
                      })}
                    </ul>
                    <FieldDescription>Atendidos em sequência, na ordem em que você marcar.</FieldDescription>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            ) : (
              <Controller
                control={form.control}
                name="packageId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="new-appointment-package">Pacote</FieldLabel>
                    <Select
                      items={packages.map(({ id, name }) => ({ value: id, label: name }))}
                      value={field.value || null}
                      onValueChange={(value) => {
                        const next = typeof value === 'string' ? value : '';
                        field.onChange(next);
                        resetDependents('package', serviceIds, next);
                      }}
                    >
                      <SelectTrigger
                        id="new-appointment-package"
                        ref={field.ref}
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="Escolha o pacote" />
                      </SelectTrigger>
                      <SelectContent>
                        {packages.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            )}

            <Controller
              control={form.control}
              name="professionalId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="new-appointment-professional">Profissional</FieldLabel>
                  <Select
                    items={aptProfessionals.map(({ id, displayName }) => ({ value: id, label: displayName }))}
                    value={field.value || null}
                    onValueChange={(value) => {
                      field.onChange(typeof value === 'string' ? value : '');
                      form.setValue('time', '');
                    }}
                  >
                    <SelectTrigger
                      id="new-appointment-professional"
                      ref={field.ref}
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
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
                  {hasWhat && aptProfessionals.length === 0 && (
                    <FieldDescription>
                      Ninguém da equipe atende essa combinação. Ajuste os serviços ou ligue-os a um profissional.
                    </FieldDescription>
                  )}
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="date"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="new-appointment-date">Dia</FieldLabel>
                  <Input
                    {...field}
                    id="new-appointment-date"
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
                  <FieldLabel htmlFor="new-appointment-time">Horário</FieldLabel>
                  <TimeSlots
                    notReadyMessage="Escolha o que agendar e o profissional para ver os horários livres."
                    isReady={hasWhat && Boolean(professionalId)}
                    isLoading={availability.isFetching}
                    slots={slots}
                    value={time}
                    onSelect={field.onChange}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Encaixe às</span>
                    <Input
                      id="new-appointment-time"
                      type="time"
                      className={cn('w-32', slots.includes(field.value) && 'text-muted-foreground')}
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

            <Controller
              control={form.control}
              name="internalNotes"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="new-appointment-notes">
                    Observação interna <span className="font-normal text-muted-foreground">(opcional)</span>
                  </FieldLabel>
                  <Textarea {...field} id="new-appointment-notes" rows={2} aria-invalid={fieldState.invalid} />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>
        </div>

        <SheetFooter className="flex-row items-center justify-between border-t">
          <span className="text-sm text-muted-foreground tabular-nums">
            {hasWhat ? `${durationMinutes} min · ${formatCurrency(totalPrice)}` : ''}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" disabled={createAppointment.isPending} onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createAppointment.isPending}>
              {createAppointment.isPending && <Spinner />}
              Agendar
            </Button>
          </div>
        </SheetFooter>
      </form>

      <CustomerFormDialog
        businessId={businessId}
        open={isCustomerFormOpen}
        onOpenChange={setIsCustomerFormOpen}
        onSaved={(created) => {
          setCustomer(created);
          form.setValue('customerId', created.id, { shouldValidate: form.formState.isSubmitted });
        }}
      />
    </>
  );
}
