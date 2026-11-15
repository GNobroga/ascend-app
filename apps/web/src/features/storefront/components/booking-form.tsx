import { TZDate } from '@date-fns/tz';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@packages/ui/components/avatar';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/components/card';
import { Checkbox } from '@packages/ui/components/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { Textarea } from '@packages/ui/components/textarea';
import { ToggleGroup, ToggleGroupItem } from '@packages/ui/components/toggle-group';
import { cn } from '@packages/ui/lib/utils';
import { useQueries, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CircleAlertIcon, UsersIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { AppointmentStatus } from '@/features/appointments';
import { EmailNotVerifiedAlert } from '@/features/auth';
import { MY_APPOINTMENTS_PATH, useCreateMyAppointment } from '@/features/my-appointments';
import { userQueries } from '@/features/users';
import { hasErrorCode, type ApiError } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { formatCurrency } from '@/shared/lib/format-currency';
import { formatMinutes } from '@/shared/lib/format-duration';
import { initialsOf } from '@/shared/lib/initials';
import { storefrontQueries } from '../api/storefront.queries';
import { todayKey } from '../booking-dates';
import { ANY_PROFESSIONAL, onlineBookingSchema, type BookingMode, type OnlineBookingValues } from '../schemas';
import type { PublicBusiness, PublicCatalog, PublicService } from '../types';
import { DayPicker } from './day-picker';
import { SlotPicker } from './slot-picker';

type BookingFormProps = {
  business: PublicBusiness;
  initialServiceIds: string[];
  initialPackageId: string | null;
};

const allServicesOf = (catalog: PublicCatalog) => [
  ...catalog.categories.flatMap(({ services }) => services),
  ...catalog.uncategorized,
];

const isBookingMode = (value: unknown): value is BookingMode => value === 'services' || value === 'package';

const slotHintOf = (hasWhat: boolean, professionalUnavailable: boolean) => {
  if (!hasWhat) return 'Escolha o que agendar para ver os horários livres.';
  if (professionalUnavailable) return 'Esse profissional não faz essa combinação. Escolha outro ou “Sem preferência”.';
  return null;
};

export function BookingForm({ business, initialServiceIds, initialPackageId }: BookingFormProps) {
  const { slug, timezone: timeZone } = business;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useSuspenseQuery(userQueries.me());
  const { data: catalog } = useSuspenseQuery(storefrontQueries.catalog(slug));
  const { data: allProfessionals } = useSuspenseQuery(storefrontQueries.professionals(slug));

  const services = allServicesOf(catalog);
  const validServiceIds = initialServiceIds.filter((id) => services.some((service) => service.id === id));
  const validPackageId = catalog.packages.some(({ id }) => id === initialPackageId) ? initialPackageId : null;

  const form = useForm<OnlineBookingValues>({
    resolver: zodResolver(onlineBookingSchema),
    defaultValues: {
      mode: validPackageId ? 'package' : 'services',
      serviceIds: validServiceIds,
      packageId: validPackageId ?? '',
      professionalId: ANY_PROFESSIONAL,
      date: todayKey(timeZone),
      startAt: '',
      customerNotes: '',
    },
  });
  const { errors } = useFormState({ control: form.control });
  const [mode, serviceIds, packageId, professionalId, date, startAt] = useWatch({
    control: form.control,
    name: ['mode', 'serviceIds', 'packageId', 'professionalId', 'date', 'startAt'],
  });

  const selection = mode === 'services' ? { serviceIds } : { packageId };
  const hasWhat = mode === 'services' ? serviceIds.length > 0 : Boolean(packageId);
  const selectedServices = services.filter(({ id }) => serviceIds.includes(id));
  const selectedPackage = catalog.packages.find(({ id }) => id === packageId);

  const professionalsByService = useQueries({
    queries: (mode === 'services' ? serviceIds : []).map((id) => storefrontQueries.professionals(slug, id)),
  });
  const aptIds = professionalsByService.every(({ data }) => data)
    ? professionalsByService.reduce<Set<string> | null>((apt, { data = [] }) => {
        const ids = new Set(data.map(({ id }) => id));
        return apt ? new Set([...apt].filter((id) => ids.has(id))) : ids;
      }, null)
    : null;
  const professionals = aptIds ? allProfessionals.filter(({ id }) => aptIds.has(id)) : allProfessionals;

  const availability = useQuery({
    ...storefrontQueries.availability(slug, { date, professionalId: professionalId || null, ...selection }),
    enabled: hasWhat,
  });
  const slots = availability.data?.slots ?? [];
  const selectedSlot = slots.find((slot) => slot.startAt === startAt);
  const assignedProfessionalId = professionalId || selectedSlot?.professionalIds[0];
  const assignedProfessional = allProfessionals.find(({ id }) => id === assignedProfessionalId);

  const durationMinutes =
    mode === 'package'
      ? (selectedPackage?.durationMinutes ?? 0)
      : selectedServices.reduce((total, service) => total + service.durationInMinutes, 0);
  const totalPrice =
    mode === 'package'
      ? (selectedPackage?.price ?? 0)
      : selectedServices.reduce((total, service) => total + service.price, 0);

  const clearTime = () => form.setValue('startAt', '');

  const createAppointment = useCreateMyAppointment({
    onError: (error) => {
      if (hasErrorCode(error, ErrorCode.APPOINTMENT_SLOT_UNAVAILABLE)) {
        clearTime();
        form.setError('startAt', { message: 'Esse horário acabou de ser ocupado. Escolha outro.' });
        void queryClient.invalidateQueries({ queryKey: [...storefrontQueries.all(slug), 'availability'] });
        return;
      }
      if (hasErrorCode(error, ErrorCode.EMAIL_NOT_VERIFIED)) {
        void queryClient.invalidateQueries({ queryKey: userQueries.me().queryKey });
        return;
      }
      if (hasErrorCode(error, ErrorCode.CUSTOMER_BLOCKED) || hasErrorCode(error, ErrorCode.SUBSCRIPTION_RESTRICTED)) {
        return;
      }
      applyApiErrors(form, error);
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    const professional = values.professionalId || selectedSlot?.professionalIds[0];
    if (!professional) {
      form.setError('startAt', { message: 'Escolha um horário.' });
      return;
    }
    createAppointment.mutate(
      {
        businessSlug: slug,
        professionalId: professional,
        startAt: values.startAt,
        customerNotes: values.customerNotes || null,
        ...(values.mode === 'services' ? { serviceIds: values.serviceIds } : { packageId: values.packageId }),
      },
      {
        onSuccess: (appointment) => {
          toast.success(
            appointment.status === AppointmentStatus.PENDING
              ? 'Pedido enviado! O negócio vai confirmar seu horário.'
              : 'Agendamento confirmado!',
          );
          void navigate(`${MY_APPOINTMENTS_PATH}/${appointment.id}`);
        },
      },
    );
  });

  const isEmailVerified = user.emailVerifiedAt !== null;
  const serverError = errors.root?.server?.message;
  const blockingError =
    hasErrorCode(createAppointment.error, ErrorCode.CUSTOMER_BLOCKED) ||
    hasErrorCode(createAppointment.error, ErrorCode.SUBSCRIPTION_RESTRICTED)
      ? createAppointment.error
      : null;
  const slotHint = slotHintOf(hasWhat, hasErrorCode(availability.error, ErrorCode.PROFESSIONAL_NOT_FOUND));

  return (
    <form noValidate onSubmit={onSubmit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-6">
        {!isEmailVerified && (
          <EmailNotVerifiedAlert description="Para agendar online, você precisa confirmar seu e-mail." />
        )}

        <BookingStep number={1} title="O que você quer agendar?">
          {catalog.packages.length > 0 && (
            <ToggleGroup
              aria-label="O que agendar"
              variant="outline"
              spacing={0}
              value={[mode]}
              onValueChange={([next]) => {
                if (!isBookingMode(next)) return;
                form.setValue('mode', next);
                form.setValue('professionalId', ANY_PROFESSIONAL);
                clearTime();
              }}
            >
              <ToggleGroupItem value="services" className="px-4">
                Serviços
              </ToggleGroupItem>
              <ToggleGroupItem value="package" className="px-4">
                Pacotes
              </ToggleGroupItem>
            </ToggleGroup>
          )}

          {mode === 'services' ? (
            <Controller
              control={form.control}
              name="serviceIds"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel id="booking-services" className="sr-only">
                    Serviços
                  </FieldLabel>
                  <ul aria-labelledby="booking-services" className="flex flex-col divide-y rounded-2xl border">
                    {services.map((service) => (
                      <li key={service.id}>
                        <ServiceOption
                          service={service}
                          checked={field.value.includes(service.id)}
                          onCheckedChange={(checked) => {
                            field.onChange(
                              checked
                                ? [...field.value, service.id]
                                : field.value.filter((current) => current !== service.id),
                            );
                            form.setValue('professionalId', ANY_PROFESSIONAL);
                            clearTime();
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                  <FieldDescription>Pode escolher mais de um: eles são feitos em sequência.</FieldDescription>
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
                  <FieldLabel id="booking-package" className="sr-only">
                    Pacote
                  </FieldLabel>
                  <div role="radiogroup" aria-labelledby="booking-package" className="flex flex-col divide-y rounded-2xl border">
                    {catalog.packages.map((item) => (
                      <label
                        key={item.id}
                        className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-0.5 px-4 py-3 has-checked:bg-accent/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/30"
                      >
                        <input
                          type="radio"
                          name="booking-package"
                          value={item.id}
                          checked={field.value === item.id}
                          className="mt-1 accent-primary"
                          onChange={() => {
                            field.onChange(item.id);
                            form.setValue('professionalId', ANY_PROFESSIONAL);
                            clearTime();
                          }}
                        />
                        <span className="font-medium">{item.name}</span>
                        <span className="text-right text-sm font-medium tabular-nums">{formatCurrency(item.price)}</span>
                        <span className="col-start-2 text-sm text-muted-foreground">
                          {item.services.map(({ name }) => name).join(' + ')}
                        </span>
                        <span className="text-right text-sm text-muted-foreground tabular-nums">
                          {formatMinutes(item.durationMinutes)}
                        </span>
                      </label>
                    ))}
                  </div>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          )}
        </BookingStep>

        <BookingStep number={2} title="Com quem?">
          <Controller
            control={form.control}
            name="professionalId"
            render={({ field }) => (
              <Field>
                <FieldLabel id="booking-professional" className="sr-only">
                  Profissional
                </FieldLabel>
                <div role="radiogroup" aria-labelledby="booking-professional" className="grid gap-2 sm:grid-cols-2">
                  <ProfessionalOption
                    name="Sem preferência"
                    description="Primeiro profissional livre"
                    icon={<UsersIcon className="size-5" />}
                    value={ANY_PROFESSIONAL}
                    checked={field.value === ANY_PROFESSIONAL}
                    onChange={(value) => {
                      field.onChange(value);
                      clearTime();
                    }}
                  />
                  {professionals.map((professional) => (
                    <ProfessionalOption
                      key={professional.id}
                      name={professional.displayName}
                      description={professional.specialties.join(', ')}
                      icon={
                        <Avatar className="size-9">
                          {professional.photoUrl && <AvatarImage src={professional.photoUrl} alt="" />}
                          <AvatarFallback className="text-xs">{initialsOf(professional.displayName)}</AvatarFallback>
                        </Avatar>
                      }
                      value={professional.id}
                      checked={field.value === professional.id}
                      onChange={(value) => {
                        field.onChange(value);
                        clearTime();
                      }}
                    />
                  ))}
                </div>
              </Field>
            )}
          />
        </BookingStep>

        <BookingStep number={3} title="Quando?">
          <Controller
            control={form.control}
            name="date"
            render={({ field }) => (
              <Field>
                <FieldLabel id="booking-day" className="sr-only">
                  Dia
                </FieldLabel>
                <DayPicker
                  labelId="booking-day"
                  value={field.value}
                  timeZone={timeZone}
                  hours={business.hours}
                  onChange={(next) => {
                    field.onChange(next);
                    clearTime();
                  }}
                />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="startAt"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Horário</FieldLabel>
                {slotHint ? (
                  <FieldDescription>{slotHint}</FieldDescription>
                ) : (
                  <SlotPicker
                    slots={slots}
                    value={field.value}
                    timeZone={timeZone}
                    isLoading={availability.isFetching && !availability.data}
                    emptyMessage="Nenhum horário livre neste dia. Tente outro dia ou outro profissional."
                    onChange={field.onChange}
                  />
                )}
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </BookingStep>

        <BookingStep number={4} title="Algum recado?">
          <Controller
            control={form.control}
            name="customerNotes"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="booking-notes">
                  Observação <span className="font-normal text-muted-foreground">(opcional)</span>
                </FieldLabel>
                <Textarea
                  {...field}
                  id="booking-notes"
                  rows={3}
                  placeholder="Ex.: Prefiro máquina 2 nas laterais."
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </BookingStep>
      </div>

      <Card className="lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="flex flex-col gap-3 text-sm">
            <SummaryRow label="Serviço">
              <SelectedItems
                packageName={mode === 'package' ? selectedPackage?.name : undefined}
                services={mode === 'services' ? selectedServices : []}
              />
            </SummaryRow>
            <SummaryRow label="Profissional">
              {assignedProfessional?.displayName ?? <span className="text-muted-foreground">Sem preferência</span>}
            </SummaryRow>
            <SummaryRow label="Quando">
              {selectedSlot ? (
                <span className="first-letter:uppercase">
                  {format(new TZDate(selectedSlot.startAt, timeZone), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </span>
              ) : (
                <span className="text-muted-foreground">A escolher</span>
              )}
            </SummaryRow>
          </dl>

          {hasWhat && (
            <div className="flex items-baseline justify-between border-t pt-3">
              <span className="text-sm text-muted-foreground">{formatMinutes(durationMinutes)}</span>
              <span className="text-lg font-semibold tabular-nums">{formatCurrency(totalPrice)}</span>
            </div>
          )}

          {serverError && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          {blockingError && <BlockingErrorAlert error={blockingError} business={business} />}

          <Button type="submit" size="lg" disabled={!isEmailVerified || createAppointment.isPending}>
            {createAppointment.isPending && <Spinner />}
            Confirmar agendamento
          </Button>
          <p className="text-xs text-muted-foreground">
            O pagamento é feito direto no local. Você pode cancelar pelo site dentro do prazo do negócio.
          </p>
        </CardContent>
      </Card>
    </form>
  );
}

type BookingStepProps = {
  number: number;
  title: string;
  children: ReactNode;
};

function BookingStep({ number, title, children }: BookingStepProps) {
  return (
    <section aria-labelledby={`booking-step-${number}`} className="flex flex-col gap-3">
      <h2 id={`booking-step-${number}`} className="flex items-center gap-2 text-base font-semibold">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground tabular-nums">
          {number}
        </span>
        {title}
      </h2>
      <FieldGroup>{children}</FieldGroup>
    </section>
  );
}

type ServiceOptionProps = {
  service: PublicService;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

function ServiceOption({ service, checked, onCheckedChange }: ServiceOptionProps) {
  const id = `booking-service-${service.id}`;

  return (
    <Field orientation="horizontal" className={cn('px-4 py-3', checked && 'bg-accent/60')}>
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <FieldLabel htmlFor={id} className="min-w-0 flex-1 justify-between font-normal">
        <span className="truncate">{service.name}</span>
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {formatMinutes(service.durationInMinutes)} · {formatCurrency(service.price)}
        </span>
      </FieldLabel>
    </Field>
  );
}

type ProfessionalOptionProps = {
  name: string;
  description: string;
  icon: ReactNode;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
};

function ProfessionalOption({ name, description, icon, value, checked, onChange }: ProfessionalOptionProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/30',
        checked ? 'border-primary bg-primary/5' : 'hover:bg-accent',
      )}
    >
      <input
        type="radio"
        name="booking-professional"
        value={value}
        checked={checked}
        className="sr-only"
        onChange={() => onChange(value)}
      />
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{name}</span>
        {description && <span className="truncate text-xs text-muted-foreground">{description}</span>}
      </span>
    </label>
  );
}

type SummaryRowProps = {
  label: string;
  children: ReactNode;
};

function SummaryRow({ label, children }: SummaryRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

type SelectedItemsProps = {
  packageName: string | undefined;
  services: PublicService[];
};

function SelectedItems({ packageName, services }: SelectedItemsProps) {
  if (packageName) return packageName;
  if (services.length === 0) return <span className="text-muted-foreground">A escolher</span>;

  return (
    <ul>
      {services.map((service) => (
        <li key={service.id} className="flex justify-between gap-2">
          <span>{service.name}</span>
          <span className="text-muted-foreground tabular-nums">{formatCurrency(service.price)}</span>
        </li>
      ))}
    </ul>
  );
}

const blockingMessageOf = (error: ApiError, business: PublicBusiness) => {
  if (error.code === ErrorCode.SUBSCRIPTION_RESTRICTED) {
    return `${business.name} não está aceitando agendamentos online no momento. Entre em contato para marcar.`;
  }

  const detail = (path: string) => error.details.find((item) => item.path === path)?.message;
  const until = detail('until');
  if (until) {
    const date = format(new TZDate(until, business.timezone), "d 'de' MMMM", { locale: ptBR });
    return `Seu agendamento online em ${business.name} está bloqueado até ${date}. Entre em contato com o negócio para marcar.`;
  }

  const feeAmount = detail('feeAmount');
  if (feeAmount) {
    return `Para voltar a agendar online em ${business.name}, é preciso pagar a taxa de ${formatCurrency(Number(feeAmount))}. Fale com o negócio para regularizar.`;
  }

  return error.message;
};

type BlockingErrorAlertProps = {
  error: ApiError;
  business: PublicBusiness;
};

function BlockingErrorAlert({ error, business }: BlockingErrorAlertProps) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertDescription>{blockingMessageOf(error, business)}</AlertDescription>
    </Alert>
  );
}
