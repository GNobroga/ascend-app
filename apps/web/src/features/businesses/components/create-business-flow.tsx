import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@packages/ui/components/alert-dialog';
import { Button } from '@packages/ui/components/button';
import { Checkbox } from '@packages/ui/components/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { Spinner } from '@packages/ui/components/spinner';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ArrowLeftIcon, ArrowRightIcon, CircleAlertIcon, XIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Controller, useForm, useFormState, useWatch, type FieldPath } from 'react-hook-form';
import { Link, useBlocker, useNavigate } from 'react-router';
import ascendLogoDark from '@/assets/brand/ascend-logo-dark.webp';
import ascendLogo from '@/assets/brand/ascend-logo.webp';
import { userQueries } from '@/features/users';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { env } from '@/shared/env';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { formatPhone, onlyDigits, slugify } from '@/shared/lib/masks';
import { formatTaxId, normalizeTaxId } from '@/shared/lib/tax-id';
import type { CreateBusinessRequest } from '../api/businesses.api';
import { useCreateBusiness } from '../api/businesses.mutations';
import { EMPTY_ADDRESS, toAddressRequest } from '../address';
import { businessPath } from '../loaders';
import { createBusinessSchema, type CreateBusinessValues } from '../schemas';
import { AddressFields } from './address-fields';

type Step = {
  title: string;
  description: string;
  fields: Array<FieldPath<CreateBusinessValues>>;
};

const STEPS: Step[] = [
  {
    title: 'Qual o nome do seu negócio?',
    description: 'É assim que seus clientes vão encontrar você.',
    fields: ['name', 'slug'],
  },
  {
    title: 'Como falar com você?',
    description: 'O contato aparece na sua página pública; o documento fica só com a gente.',
    fields: ['email', 'taxId', 'phone', 'phoneIsWhatsApp'],
  },
  {
    title: 'Onde você atende?',
    description: 'O endereço ajuda seus clientes a chegarem até você.',
    fields: ['address'],
  },
];

const BUSINESS_CREATED_STATE = { businessCreated: true };

const isBusinessCreatedState = (state: unknown) =>
  typeof state === 'object' && state !== null && 'businessCreated' in state;

const stepIndexOfPath = (path: string) =>
  STEPS.findIndex(({ fields }) => fields.some((field) => path === field || path.startsWith(`${field}.`)));

const toRequest = ({ taxId, phone, phoneIsWhatsApp, address, ...values }: CreateBusinessValues): CreateBusinessRequest => ({
  ...values,
  taxId: normalizeTaxId(taxId),
  phone: phone ? onlyDigits(phone) : null,
  phoneIsWhatsApp: Boolean(phone) && phoneIsWhatsApp,
  address: toAddressRequest(address),
});

export function CreateBusinessFlow() {
  const navigate = useNavigate();
  const { data: user } = useSuspenseQuery(userQueries.me());
  const [stepIndex, setStepIndex] = useState(0);

  const form = useForm<CreateBusinessValues>({
    resolver: zodResolver(createBusinessSchema),
    defaultValues: {
      name: '',
      slug: '',
      email: user.email,
      taxId: '',
      phone: '',
      phoneIsWhatsApp: false,
      address: EMPTY_ADDRESS,
    },
  });
  const { errors, isDirty } = useFormState({ control: form.control });
  const [phone, slug] = useWatch({ control: form.control, name: ['phone', 'slug'] });

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !isBusinessCreatedState(nextLocation.state) && currentLocation.pathname !== nextLocation.pathname,
  );

  const goToFirstStepWithError = (paths: string[]) => {
    const indexes = paths.map(stepIndexOfPath).filter((index) => index >= 0);
    if (indexes.length > 0) setStepIndex(Math.min(...indexes));
  };

  const createBusiness = useCreateBusiness({
    onError: (error) => {
      if (hasErrorCode(error, ErrorCode.BUSINESS_SLUG_IN_USE)) {
        form.setError('slug', { message: error.message });
        setStepIndex(stepIndexOfPath('slug'));
        return;
      }
      if (hasErrorCode(error, ErrorCode.BUSINESS_TAX_ID_IN_USE)) {
        form.setError('taxId', { message: error.message });
        setStepIndex(stepIndexOfPath('taxId'));
        return;
      }
      applyApiErrors(form, error);
      if (hasErrorCode(error, ErrorCode.VALIDATION_ERROR)) {
        goToFirstStepWithError(error.details.map(({ path }) => path));
      }
    },
  });

  const submit = form.handleSubmit(
    (values) => {
      createBusiness.mutate(toRequest(values), {
        onSuccess: (business) => {
          void navigate(businessPath(business.id), { replace: true, state: BUSINESS_CREATED_STATE });
        },
      });
    },
    (fieldErrors) => goToFirstStepWithError(Object.keys(fieldErrors)),
  );

  const currentStep = STEPS[stepIndex];
  if (!currentStep) return null;

  const isLastStep = stepIndex === STEPS.length - 1;
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const serverError = errors.root?.server?.message;

  const goToNextStep = async () => {
    const isValid = await form.trigger(currentStep.fields, { shouldFocus: true });
    if (isValid) setStepIndex((index) => index + 1);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (isLastStep) {
      void submit(event);
      return;
    }
    event.preventDefault();
    void goToNextStep();
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex h-svh flex-col bg-background">
      <header className="relative flex h-14 shrink-0 items-center justify-between px-4 md:px-6">
        <img src={ascendLogo} alt={env.VITE_APP_NAME} className="h-7 w-auto dark:hidden" />
        <img src={ascendLogoDark} alt={env.VITE_APP_NAME} className="hidden h-7 w-auto dark:block" />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sair do cadastro"
          nativeButton={false}
          render={<Link to="/" />}
        >
          <XIcon />
        </Button>
        <progress
          aria-label="Progresso do cadastro"
          value={stepIndex + 1}
          max={STEPS.length}
          className="sr-only"
        />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-border">
          <div
            className="h-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-10 md:py-16">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-primary">
              Etapa {stepIndex + 1} de {STEPS.length}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">{currentStep.title}</h1>
            <p className="text-muted-foreground">{currentStep.description}</p>
          </div>

          <FieldGroup>
            {serverError && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            {stepIndex === 0 && (
              <>
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="name">Nome do negócio</FieldLabel>
                      <Input
                        {...field}
                        id="name"
                        autoComplete="organization"
                        placeholder="Barbearia do João"
                        aria-invalid={fieldState.invalid}
                        onChange={(event) => {
                          field.onChange(event);
                          if (!form.getFieldState('slug').isDirty) {
                            form.setValue('slug', slugify(event.target.value));
                          }
                        }}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="slug"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="slug">Endereço da página</FieldLabel>
                      <Input
                        {...field}
                        id="slug"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="barbearia-do-joao"
                        aria-invalid={fieldState.invalid}
                        aria-describedby="slug-hint"
                        onChange={(event) => field.onChange(event.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      />
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : (
                        <FieldDescription id="slug-hint" className="break-all">
                          Sua página pública: {window.location.host}/
                          <span className="font-medium text-foreground">{slug || 'seu-negocio'}</span>
                        </FieldDescription>
                      )}
                    </Field>
                  )}
                />
              </>
            )}

            {stepIndex === 1 && (
              <>
                <Controller
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="email">E-mail de contato</FieldLabel>
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="contato@seunegocio.com.br"
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="taxId"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="taxId">CPF ou CNPJ</FieldLabel>
                      <Input
                        {...field}
                        id="taxId"
                        autoCapitalize="characters"
                        spellCheck={false}
                        placeholder="00.000.000/0000-00"
                        aria-invalid={fieldState.invalid}
                        onChange={(event) => field.onChange(formatTaxId(event.target.value))}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="phone">
                        Telefone <span className="font-normal text-muted-foreground">(opcional)</span>
                      </FieldLabel>
                      <Input
                        {...field}
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="(11) 99999-0000"
                        aria-invalid={fieldState.invalid}
                        onChange={(event) => field.onChange(formatPhone(event.target.value))}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="phoneIsWhatsApp"
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <Checkbox
                        id="phoneIsWhatsApp"
                        checked={Boolean(phone) && field.value}
                        disabled={!phone}
                        onCheckedChange={field.onChange}
                      />
                      <FieldLabel htmlFor="phoneIsWhatsApp" className="font-normal">
                        Este número atende no WhatsApp
                      </FieldLabel>
                    </Field>
                  )}
                />
              </>
            )}

            {stepIndex === 2 && <AddressFields form={form} />}
          </FieldGroup>
        </div>
      </main>

      <footer className="shrink-0 border-t bg-background">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-4 py-3">
          {stepIndex > 0 ? (
            <Button type="button" variant="ghost" size="lg" onClick={() => setStepIndex((index) => index - 1)}>
              <ArrowLeftIcon />
              Voltar
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" size="lg" disabled={createBusiness.isPending}>
            {createBusiness.isPending && <Spinner />}
            {isLastStep ? 'Criar negócio' : 'Continuar'}
            {!isLastStep && <ArrowRightIcon />}
          </Button>
        </div>
      </footer>

      <AlertDialog open={blocker.state === 'blocked'} onOpenChange={(open) => !open && blocker.reset?.()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar cadastro?</AlertDialogTitle>
            <AlertDialogDescription>
              As informações que você preencheu serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar cadastro</AlertDialogCancel>
            <AlertDialogAction type="button" variant="destructive" onClick={() => blocker.proceed?.()}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
