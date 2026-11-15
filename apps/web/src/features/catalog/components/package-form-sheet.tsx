import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Checkbox } from '@packages/ui/components/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@packages/ui/components/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@packages/ui/components/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@packages/ui/components/sheet';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { Switch } from '@packages/ui/components/switch';
import { Textarea } from '@packages/ui/components/textarea';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CircleAlertIcon } from 'lucide-react';
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { formatCurrency } from '@/shared/lib/format-currency';
import { formatMinutes } from '@/shared/lib/format-duration';
import { useCreatePackage, useUpdatePackage } from '../api/catalog.mutations';
import { catalogQueries } from '../api/catalog.queries';
import { packageDiscount } from '../package-pricing';
import {
  MAX_PACKAGE_SERVICES,
  MAX_SERVICE_DURATION,
  MIN_PACKAGE_SERVICES,
  MIN_SERVICE_DURATION,
  packageSchema,
  type PackageValues,
} from '../schemas';
import { CommissionMode, type Package, type PackageService } from '../types';
import { CatalogImagesField } from './catalog-images-field';

const FORM_ID = 'package-form';

const COMMISSION_OPTIONS = [
  { value: CommissionMode.PRORATED, label: 'Por serviço' },
  { value: CommissionMode.PACKAGE, label: 'Sobre o pacote' },
];

const COMMISSION_DESCRIPTIONS: Record<CommissionMode, string> = {
  [CommissionMode.PRORATED]:
    'O preço do pacote é dividido entre os serviços e cada um usa a comissão que o profissional tem nele.',
  [CommissionMode.PACKAGE]: 'Uma comissão única sobre o preço do pacote, definida no profissional.',
};

const isCommissionMode = (value: unknown): value is CommissionMode =>
  value === CommissionMode.PACKAGE || value === CommissionMode.PRORATED;

const toFormValues = (item?: Package): PackageValues => ({
  name: item?.name ?? '',
  description: item?.description ?? '',
  serviceIds: item?.services.map(({ serviceId }) => serviceId) ?? [],
  price: item?.price ?? Number.NaN,
  durationMinutes: item?.durationMinutes ?? Number.NaN,
  commissionMode: item?.commissionMode ?? CommissionMode.PRORATED,
  isActive: item?.isActive ?? true,
});

type PackageFormSheetProps = {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  focusPhotos?: boolean;
  item?: Package;
};

export function PackageFormSheet({ businessId, open, onOpenChange, focusPhotos = false, item }: PackageFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{item ? 'Editar pacote' : 'Novo pacote'}</SheetTitle>
          <SheetDescription>
            {item
              ? 'Mudanças valem para os próximos agendamentos.'
              : 'Junte serviços que costumam ser feitos juntos e ofereça um preço especial.'}
          </SheetDescription>
        </SheetHeader>
        {open && (
          <PackageForm
            key={item?.id ?? 'new'}
            businessId={businessId}
            item={item}
            focusPhotos={focusPhotos}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

type PackageFormProps = {
  businessId: string;
  focusPhotos: boolean;
  item?: Package;
  onDone: () => void;
};

function PackageForm({ businessId, item, focusPhotos, onDone }: PackageFormProps) {
  const { data: services } = useSuspenseQuery(catalogQueries.services(businessId));

  const form = useForm<PackageValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: toFormValues(item),
  });
  const { errors } = useFormState({ control: form.control });
  const [selectedIds, price, commissionMode] = useWatch({
    control: form.control,
    name: ['serviceIds', 'price', 'commissionMode'],
  });

  const selectableServices: PackageService[] = [
    ...services.map(({ id, name, price: servicePrice, durationInMinutes, isActive }) => ({
      serviceId: id,
      name,
      price: servicePrice,
      durationInMinutes,
      isActive,
    })),
    ...(item?.services.filter(({ serviceId }) => !services.some(({ id }) => id === serviceId)) ?? []),
  ];
  const selectedServices = selectableServices.filter(({ serviceId }) => selectedIds.includes(serviceId));
  const servicesPrice = selectedServices.reduce((total, service) => total + service.price, 0);
  const servicesDuration = selectedServices.reduce((total, service) => total + service.durationInMinutes, 0);
  const discount = Number.isNaN(price) ? null : packageDiscount(price, servicesPrice);

  const toggleService = (serviceId: string, checked: boolean) => {
    const next = checked ? [...selectedIds, serviceId] : selectedIds.filter((id) => id !== serviceId);
    form.setValue('serviceIds', next, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });

    const currentDuration = form.getValues('durationMinutes');
    if (Number.isNaN(currentDuration) || currentDuration === servicesDuration) {
      const nextDuration = selectableServices
        .filter((service) => next.includes(service.serviceId))
        .reduce((total, service) => total + service.durationInMinutes, 0);
      form.setValue('durationMinutes', nextDuration > 0 ? nextDuration : Number.NaN);
    }
  };

  const handleError = (error: Error) => {
    if (hasErrorCode(error, ErrorCode.SERVICE_NOT_FOUND)) {
      form.setError('serviceIds', { message: 'Algum serviço escolhido não existe mais. Revise a seleção.' });
      return;
    }
    applyApiErrors(form, error);
  };

  const createPackage = useCreatePackage(businessId, { onError: handleError });
  const updatePackage = useUpdatePackage(businessId, { onError: handleError });
  const isPending = createPackage.isPending || updatePackage.isPending;

  const onSubmit = form.handleSubmit((values) => {
    const body = { ...values, description: values.description || null };
    if (item) {
      updatePackage.mutate(
        { packageId: item.id, body },
        {
          onSuccess: () => {
            toast.success('Pacote atualizado.');
            onDone();
          },
        },
      );
      return;
    }
    createPackage.mutate(body, {
      onSuccess: () => {
        toast.success('Pacote criado.');
        onDone();
      },
    });
  });

  const serverError = errors.root?.server?.message;
  const reachedLimit = selectedIds.length >= MAX_PACKAGE_SERVICES;

  return (
    <>
      <form id={FORM_ID} noValidate onSubmit={onSubmit} className="flex-1 overflow-y-auto px-6 pb-8">
        <FieldGroup>
          {serverError && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="package-name">Nome</FieldLabel>
                <Input
                  {...field}
                  id="package-name"
                  placeholder="Ex.: Corte + Barba"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="package-description">
                  Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
                </FieldLabel>
                <Textarea
                  {...field}
                  id="package-description"
                  rows={2}
                  placeholder="O que o cliente recebe neste pacote"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <FieldSet data-invalid={Boolean(errors.serviceIds)}>
            <FieldLegend variant="label">Serviços incluídos</FieldLegend>
            <FieldDescription>
              Escolha de {MIN_PACKAGE_SERVICES} a {MAX_PACKAGE_SERVICES} serviços. Eles são feitos em sequência.
            </FieldDescription>
            {selectableServices.length < MIN_PACKAGE_SERVICES ? (
              <Alert>
                <CircleAlertIcon />
                <AlertDescription>Cadastre pelo menos {MIN_PACKAGE_SERVICES} serviços para montar um pacote.</AlertDescription>
              </Alert>
            ) : (
              <ul className="flex max-h-64 flex-col divide-y overflow-y-auto rounded-2xl border">
                {selectableServices.map((service) => {
                  const checked = selectedIds.includes(service.serviceId);
                  const checkboxId = `package-service-${service.serviceId}`;

                  return (
                    <li key={service.serviceId}>
                      <label
                        htmlFor={checkboxId}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent/50 has-disabled:cursor-not-allowed has-disabled:opacity-50"
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={checked}
                          disabled={!checked && reachedLimit}
                          onCheckedChange={(value) => toggleService(service.serviceId, value)}
                        />
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate">{service.name}</span>
                          {!service.isActive && <Badge variant="secondary">Inativo</Badge>}
                        </span>
                        <span className="shrink-0 text-muted-foreground">{formatMinutes(service.durationInMinutes)}</span>
                        <span className="w-20 shrink-0 text-right tabular-nums">{formatCurrency(service.price)}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            {selectedServices.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedServices.length} selecionados · soma de{' '}
                <span className="font-medium text-foreground">{formatCurrency(servicesPrice)}</span> e{' '}
                <span className="font-medium text-foreground">{formatMinutes(servicesDuration)}</span>
              </p>
            )}
            <FieldError errors={[errors.serviceIds]} />
          </FieldSet>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="price"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="package-price">Preço do pacote</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>R$</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      ref={field.ref}
                      name={field.name}
                      onBlur={field.onBlur}
                      id="package-price"
                      type="number"
                      min={0}
                      step={0.01}
                      inputMode="decimal"
                      placeholder="0,00"
                      value={Number.isNaN(field.value) ? '' : field.value}
                      onChange={(event) => field.onChange(event.target.valueAsNumber)}
                      aria-invalid={fieldState.invalid}
                    />
                  </InputGroup>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : (
                    discount && (
                      <FieldDescription className="text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(discount.amount)} de desconto ({discount.percent}%)
                      </FieldDescription>
                    )
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="durationMinutes"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="package-duration">Duração exibida</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      ref={field.ref}
                      name={field.name}
                      onBlur={field.onBlur}
                      id="package-duration"
                      type="number"
                      min={MIN_SERVICE_DURATION}
                      max={MAX_SERVICE_DURATION}
                      step={5}
                      inputMode="numeric"
                      value={Number.isNaN(field.value) ? '' : field.value}
                      onChange={(event) => field.onChange(event.target.valueAsNumber)}
                      aria-invalid={fieldState.invalid}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>min</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : (
                    <FieldDescription>
                      A agenda reserva a soma dos serviços
                      {servicesDuration > 0 && ` (${formatMinutes(servicesDuration)})`}.
                    </FieldDescription>
                  )}
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="commissionMode"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="package-commission">Comissão do profissional</FieldLabel>
                <Select
                  items={COMMISSION_OPTIONS}
                  value={field.value}
                  onValueChange={(value) => {
                    if (isCommissionMode(value)) field.onChange(value);
                  }}
                >
                  <SelectTrigger id="package-commission" ref={field.ref} onBlur={field.onBlur} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMISSION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>{COMMISSION_DESCRIPTIONS[commissionMode]}</FieldDescription>
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="package-active">Disponível para agendamento</FieldLabel>
                  <FieldDescription>Desligado, o pacote some da sua página e não pode ser agendado online.</FieldDescription>
                </FieldContent>
                <Switch id="package-active" checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )}
          />

          <FieldSeparator />

          {item ? (
            <CatalogImagesField
              businessId={businessId}
              owner={{ kind: 'packages', id: item.id }}
              scrollIntoView={focusPhotos}
            />
          ) : (
            <FieldDescription>Depois de criar, você poderá adicionar fotos.</FieldDescription>
          )}
        </FieldGroup>
      </form>

      <SheetFooter className="flex-row justify-end border-t">
        <Button type="button" variant="ghost" disabled={isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" form={FORM_ID} disabled={isPending}>
          {isPending && <Spinner />}
          {item ? 'Salvar alterações' : 'Criar pacote'}
        </Button>
      </SheetFooter>
    </>
  );
}
