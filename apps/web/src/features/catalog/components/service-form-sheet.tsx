import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
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
import { formatMinutes } from '@/shared/lib/format-duration';
import { useCreateService, useUpdateService } from '../api/catalog.mutations';
import { catalogQueries } from '../api/catalog.queries';
import { MAX_SERVICE_DURATION, MIN_SERVICE_DURATION, serviceSchema, type ServiceValues } from '../schemas';
import type { Service } from '../types';
import { CatalogImagesField } from './catalog-images-field';

const NO_CATEGORY = '';

const FORM_ID = 'service-form';

const toFormValues = (service?: Service): ServiceValues => ({
  name: service?.name ?? '',
  description: service?.description ?? '',
  categoryId: service?.categoryId ?? NO_CATEGORY,
  durationInMinutes: service?.durationInMinutes ?? 30,
  price: service?.price ?? Number.NaN,
  isActive: service?.isActive ?? true,
});

const toRequest = (values: ServiceValues) => ({
  name: values.name,
  description: values.description || null,
  categoryId: values.categoryId || null,
  durationInMinutes: values.durationInMinutes,
  price: values.price,
  isActive: values.isActive,
});

type ServiceFormSheetProps = {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  focusPhotos?: boolean;
  service?: Service;
};

export function ServiceFormSheet({ businessId, open, onOpenChange, focusPhotos = false, service }: ServiceFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{service ? 'Editar serviço' : 'Novo serviço'}</SheetTitle>
          <SheetDescription>
            {service
              ? 'Mudanças de preço e duração valem para os próximos agendamentos.'
              : 'Informe o que o cliente vai agendar, quanto custa e quanto tempo leva.'}
          </SheetDescription>
        </SheetHeader>
        {open && (
          <ServiceForm
            key={service?.id ?? 'new'}
            businessId={businessId}
            service={service}
            focusPhotos={focusPhotos}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

type ServiceFormProps = {
  businessId: string;
  focusPhotos: boolean;
  service?: Service;
  onDone: () => void;
};

function ServiceForm({ businessId, service, focusPhotos, onDone }: ServiceFormProps) {
  const { data: categories } = useSuspenseQuery(catalogQueries.categories(businessId));

  const form = useForm<ServiceValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: toFormValues(service),
  });
  const { errors } = useFormState({ control: form.control });
  const duration = useWatch({ control: form.control, name: 'durationInMinutes' });

  const handleError = (error: Error) => {
    if (hasErrorCode(error, ErrorCode.SERVICE_CATEGORY_NOT_FOUND)) {
      form.setError('categoryId', { message: 'Esta categoria não existe mais. Escolha outra.' });
      return;
    }
    applyApiErrors(form, error);
  };

  const createService = useCreateService(businessId, { onError: handleError });
  const updateService = useUpdateService(businessId, { onError: handleError });
  const isPending = createService.isPending || updateService.isPending;

  const onSubmit = form.handleSubmit((values) => {
    const body = toRequest(values);
    if (service) {
      updateService.mutate(
        { serviceId: service.id, body },
        {
          onSuccess: () => {
            toast.success('Serviço atualizado.');
            onDone();
          },
        },
      );
      return;
    }
    createService.mutate(body, {
      onSuccess: () => {
        toast.success('Serviço criado.');
        onDone();
      },
    });
  });

  const categoryOptions = [
    { value: NO_CATEGORY, label: 'Sem categoria' },
    ...categories.map(({ id, name, isActive }) => ({ value: id, label: isActive ? name : `${name} (inativa)` })),
  ];
  const serverError = errors.root?.server?.message;

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
                <FieldLabel htmlFor="service-name">Nome</FieldLabel>
                <Input
                  {...field}
                  id="service-name"
                  placeholder="Ex.: Corte masculino"
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
                <FieldLabel htmlFor="service-description">
                  Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
                </FieldLabel>
                <Textarea
                  {...field}
                  id="service-description"
                  rows={3}
                  placeholder="O que está incluso no serviço"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="categoryId"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="service-category">Categoria</FieldLabel>
                <Select
                  items={categoryOptions}
                  value={field.value}
                  onValueChange={(value) => field.onChange(typeof value === 'string' ? value : NO_CATEGORY)}
                >
                  <SelectTrigger
                    id="service-category"
                    ref={field.ref}
                    onBlur={field.onBlur}
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="durationInMinutes"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="service-duration">Duração</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      ref={field.ref}
                      name={field.name}
                      onBlur={field.onBlur}
                      id="service-duration"
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
                    duration >= 60 && <FieldDescription>{formatMinutes(duration)}</FieldDescription>
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="price"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="service-price">Preço</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>R$</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      ref={field.ref}
                      name={field.name}
                      onBlur={field.onBlur}
                      id="service-price"
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
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="service-active">Disponível para agendamento</FieldLabel>
                  <FieldDescription>Desligado, o serviço some da sua página e não pode ser agendado.</FieldDescription>
                </FieldContent>
                <Switch id="service-active" checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )}
          />

          <FieldSeparator />

          {service ? (
            <CatalogImagesField
              businessId={businessId}
              owner={{ kind: 'services', id: service.id }}
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
          {service ? 'Salvar alterações' : 'Criar serviço'}
        </Button>
      </SheetFooter>
    </>
  );
}
