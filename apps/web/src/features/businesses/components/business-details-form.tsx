import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import { Checkbox } from '@packages/ui/components/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { SaveBar, SaveBarActions, SaveBarMessage } from '@packages/ui/components/save-bar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@packages/ui/components/select';
import {
  SettingsSection as Section,
  SettingsSectionContent,
  SettingsSectionDescription,
  SettingsSectionHeader,
  SettingsSectionTitle,
} from '@packages/ui/components/settings-section';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { Textarea } from '@packages/ui/components/textarea';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CircleAlertIcon, ImageMinusIcon, ImageUpIcon, TriangleAlertIcon } from 'lucide-react';
import { useRef, type ChangeEvent, type ReactNode } from 'react';
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { ACCEPTED_IMAGE_TYPES, imageFileError, MAX_IMAGE_SIZE_MB } from '@/shared/lib/image-file';
import { formatPhone, formatPostalCode, onlyDigits } from '@/shared/lib/masks';
import { formatTaxId } from '@/shared/lib/tax-id';
import { toAddressRequest } from '../address';
import { useRemoveBusinessLogo, useSetBusinessLogo, useUpdateBusiness } from '../api/businesses.mutations';
import { businessQueries } from '../api/businesses.queries';
import { businessDetailsSchema, type BusinessDetailsValues } from '../schemas';
import { timezoneOptions } from '../timezones';
import type { Business } from '../types';
import { AddressFields } from './address-fields';
import { BusinessAvatar } from './business-avatar';

const BRAZIL_DIALING_CODE = '+55';

const toPhoneInput = (phone: string | null) =>
  phone ? formatPhone(phone.startsWith(BRAZIL_DIALING_CODE) ? phone.slice(BRAZIL_DIALING_CODE.length) : phone) : '';

const toFormValues = (business: Business): BusinessDetailsValues => ({
  name: business.name,
  slug: business.slug,
  description: business.description ?? '',
  email: business.email,
  phone: toPhoneInput(business.phone),
  phoneIsWhatsApp: business.phoneIsWhatsApp,
  timezone: business.timezone,
  address: {
    ...business.address,
    postalCode: formatPostalCode(business.address.postalCode),
    complement: business.address.complement ?? '',
  },
});

type BusinessDetailsFormProps = {
  businessId: string;
};

export function BusinessDetailsForm({ businessId }: BusinessDetailsFormProps) {
  const { data: business } = useSuspenseQuery(businessQueries.detail(businessId));
  const form = useForm<BusinessDetailsValues>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: toFormValues(business),
  });
  const { errors, isDirty } = useFormState({ control: form.control });
  const [slug, phone] = useWatch({ control: form.control, name: ['slug', 'phone'] });
  const updateBusiness = useUpdateBusiness(businessId, {
    onError: (error) => {
      if (hasErrorCode(error, ErrorCode.BUSINESS_SLUG_IN_USE)) {
        form.setError('slug', { message: error.message }, { shouldFocus: true });
        return;
      }
      applyApiErrors(form, error);
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    updateBusiness.mutate(
      {
        ...values,
        description: values.description || null,
        phone: values.phone ? onlyDigits(values.phone) : null,
        phoneIsWhatsApp: Boolean(values.phone) && values.phoneIsWhatsApp,
        address: toAddressRequest(values.address),
      },
      {
        onSuccess: (saved) => {
          form.reset(toFormValues(saved));
          toast.success('Dados do negócio salvos.');
        },
      },
    );
  });

  const serverError = errors.root?.server?.message;
  const slugChanged = slug !== business.slug;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-8">
      {serverError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <DetailsSection title="Identidade" description="Como o negócio aparece para os clientes.">
        <BusinessLogoField businessId={businessId} business={business} />

        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="business-name">Nome do negócio</FieldLabel>
              <Input {...field} id="business-name" autoComplete="organization" aria-invalid={fieldState.invalid} />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="slug"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="business-slug">Endereço da página</FieldLabel>
              <Input
                {...field}
                id="business-slug"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={fieldState.invalid}
                onChange={(event) => field.onChange(event.target.value.toLowerCase().replace(/\s+/g, '-'))}
              />
              <FieldDescription className="break-all">
                Sua página pública: {window.location.host}/
                <span className="font-medium text-foreground">{slug || 'seu-negocio'}</span>
              </FieldDescription>
              {slugChanged && (
                <FieldDescription className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <TriangleAlertIcon className="size-4 shrink-0" />
                  Trocar o endereço quebra os links antigos que você já divulgou.
                </FieldDescription>
              )}
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="business-description">
                Sobre o negócio <span className="font-normal text-muted-foreground">(opcional)</span>
              </FieldLabel>
              <Textarea
                {...field}
                id="business-description"
                rows={3}
                placeholder="Ex.: Cortes clássicos e barba desde 1998."
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Field>
          <FieldLabel>CPF ou CNPJ</FieldLabel>
          <span className="text-sm tabular-nums">{formatTaxId(business.taxId)}</span>
          <FieldDescription>Não pode ser alterado. Fale com o suporte se estiver errado.</FieldDescription>
        </Field>
      </DetailsSection>

      <DetailsSection title="Contato" description="Aparece na sua página pública.">
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="business-email">E-mail de contato</FieldLabel>
              <Input
                {...field}
                id="business-email"
                type="email"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
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
              <FieldLabel htmlFor="business-phone">
                Telefone <span className="font-normal text-muted-foreground">(opcional)</span>
              </FieldLabel>
              <Input
                {...field}
                id="business-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 99999-0000"
                className="sm:max-w-xs"
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
                id="business-phone-whatsapp"
                checked={Boolean(phone) && field.value}
                disabled={!phone}
                onCheckedChange={field.onChange}
              />
              <FieldLabel htmlFor="business-phone-whatsapp" className="font-normal">
                Este número atende no WhatsApp
              </FieldLabel>
            </Field>
          )}
        />
      </DetailsSection>

      <DetailsSection title="Endereço" description="Onde os clientes encontram você.">
        <AddressFields form={form} />
      </DetailsSection>

      <DetailsSection
        title="Fuso horário"
        description="A agenda, os horários livres e os lembretes usam este fuso."
      >
        <Controller
          control={form.control}
          name="timezone"
          render={({ field, fieldState }) => {
            const options = timezoneOptions(business.timezone);
            return (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="business-timezone">Fuso horário</FieldLabel>
                <Select items={options} value={field.value} onValueChange={(value) => value && field.onChange(value)}>
                  <SelectTrigger
                    id="business-timezone"
                    ref={field.ref}
                    className="w-full sm:max-w-xs"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[fieldState.error]} />
              </Field>
            );
          }}
        />
      </DetailsSection>

      {isDirty && (
        <SaveBar aria-label="Alterações não salvas">
          <SaveBarMessage>Você tem alterações não salvas.</SaveBarMessage>
          <SaveBarActions>
            <Button type="button" variant="ghost" disabled={updateBusiness.isPending} onClick={() => form.reset()}>
              Descartar
            </Button>
            <Button type="submit" disabled={updateBusiness.isPending}>
              {updateBusiness.isPending && <Spinner />}
              Salvar dados
            </Button>
          </SaveBarActions>
        </SaveBar>
      )}
    </form>
  );
}

type DetailsSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function DetailsSection({ title, description, children }: DetailsSectionProps) {
  return (
    <Section>
      <SettingsSectionHeader>
        <SettingsSectionTitle>{title}</SettingsSectionTitle>
        <SettingsSectionDescription>{description}</SettingsSectionDescription>
      </SettingsSectionHeader>
      <SettingsSectionContent>
        <Card>
          <CardContent>
            <FieldGroup>{children}</FieldGroup>
          </CardContent>
        </Card>
      </SettingsSectionContent>
    </Section>
  );
}

type BusinessLogoFieldProps = {
  businessId: string;
  business: Business;
};

function BusinessLogoField({ businessId, business }: BusinessLogoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const setLogo = useSetBusinessLogo(businessId);
  const removeLogo = useRemoveBusinessLogo(businessId);
  const isSaving = setLogo.isPending || removeLogo.isPending;

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const error = imageFileError(file);
    if (error) {
      toast.error(error);
      return;
    }
    setLogo.mutate(file, { onSuccess: () => toast.success('Logo atualizada.') });
  };

  return (
    <Field>
      <FieldLabel>Logo</FieldLabel>
      <div className="flex items-center gap-4">
        <div className="relative">
          <BusinessAvatar business={business} className="size-16 text-lg" />
          {isSaving && (
            <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70">
              <Spinner />
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => inputRef.current?.click()}>
            <ImageUpIcon />
            {business.logoUrl ? 'Trocar logo' : 'Enviar logo'}
          </Button>
          {business.logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSaving}
              onClick={() => removeLogo.mutate(undefined, { onSuccess: () => toast.success('Logo removida.') })}
            >
              <ImageMinusIcon />
              Remover
            </Button>
          )}
        </div>
      </div>
      <FieldDescription>Aparece na sua página e no menu. Quadrada, até {MAX_IMAGE_SIZE_MB} MB.</FieldDescription>
      <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} hidden onChange={handleFile} />
    </Field>
  );
}
