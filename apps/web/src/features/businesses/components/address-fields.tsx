import { Field, FieldDescription, FieldError, FieldLabel } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@packages/ui/components/select';
import { Spinner } from '@packages/ui/components/spinner';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { postalCodeQueries } from '@/features/postal-codes';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { formatPostalCode, onlyDigits } from '@/shared/lib/masks';
import { BRAZILIAN_STATES, type AddressFormValues } from '../schemas';

type PostalCodeLookupStatus = 'idle' | 'loading' | 'found' | 'not-found';

const AUTOFILLED_ADDRESS_FIELDS = ['street', 'district', 'city', 'state'] as const;

type AddressFieldsProps<TValues extends AddressFormValues> = {
  form: UseFormReturn<TValues>;
};

export function AddressFields<TValues extends AddressFormValues>({ form }: AddressFieldsProps<TValues>) {
  const addressForm = form as unknown as UseFormReturn<AddressFormValues>;
  const queryClient = useQueryClient();
  const [postalCodeStatus, setPostalCodeStatus] = useState<PostalCodeLookupStatus>('idle');

  const fillAddressFromPostalCode = async (postalCode: string) => {
    setPostalCodeStatus('loading');
    try {
      const address = await queryClient.query(postalCodeQueries.detail(postalCode));
      if (onlyDigits(addressForm.getValues('address.postalCode')) !== postalCode) return;

      for (const field of AUTOFILLED_ADDRESS_FIELDS) {
        const value = address[field];
        if (value && !addressForm.getFieldState(`address.${field}`).isDirty) {
          addressForm.setValue(`address.${field}`, value, { shouldValidate: addressForm.formState.isSubmitted });
        }
      }
      setPostalCodeStatus('found');
      addressForm.setFocus('address.number');
    } catch (error) {
      if (onlyDigits(addressForm.getValues('address.postalCode')) !== postalCode) return;
      setPostalCodeStatus(hasErrorCode(error, ErrorCode.POSTAL_CODE_NOT_FOUND) ? 'not-found' : 'idle');
    }
  };

  return (
    <div className="grid grid-cols-6 gap-x-3 gap-y-6">
      <Controller
        control={addressForm.control}
        name="address.postalCode"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="col-span-6 sm:col-span-3">
            <FieldLabel htmlFor="postalCode">CEP</FieldLabel>
            <div className="relative">
              <Input
                {...field}
                id="postalCode"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                aria-invalid={fieldState.invalid}
                aria-describedby="postal-code-hint"
                aria-busy={postalCodeStatus === 'loading'}
                className="pr-9"
                onChange={(event) => {
                  const value = formatPostalCode(event.target.value);
                  field.onChange(value);
                  const digits = onlyDigits(value);
                  if (digits.length === 8) {
                    void fillAddressFromPostalCode(digits);
                  } else {
                    setPostalCodeStatus('idle');
                  }
                }}
              />
              {postalCodeStatus === 'loading' && (
                <Spinner className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
            {fieldState.invalid ? (
              <FieldError errors={[fieldState.error]} />
            ) : (
              <FieldDescription id="postal-code-hint" aria-live="polite">
                {postalCodeStatus === 'not-found'
                  ? 'CEP não encontrado. Preencha o endereço manualmente.'
                  : 'Preenchemos o endereço a partir do CEP.'}
              </FieldDescription>
            )}
          </Field>
        )}
      />

      <Controller
        control={addressForm.control}
        name="address.street"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="col-span-6">
            <FieldLabel htmlFor="street">Rua</FieldLabel>
            <Input
              {...field}
              id="street"
              autoComplete="address-line1"
              placeholder="Avenida Paulista"
              aria-invalid={fieldState.invalid}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={addressForm.control}
        name="address.number"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="col-span-2">
            <FieldLabel htmlFor="number">Número</FieldLabel>
            <Input {...field} id="number" placeholder="1578" aria-invalid={fieldState.invalid} />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={addressForm.control}
        name="address.complement"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="col-span-4">
            <FieldLabel htmlFor="complement">
              Complemento <span className="font-normal text-muted-foreground">(opcional)</span>
            </FieldLabel>
            <Input
              {...field}
              id="complement"
              autoComplete="address-line2"
              placeholder="Sala 12"
              aria-invalid={fieldState.invalid}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={addressForm.control}
        name="address.district"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="col-span-6">
            <FieldLabel htmlFor="district">Bairro</FieldLabel>
            <Input {...field} id="district" placeholder="Bela Vista" aria-invalid={fieldState.invalid} />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={addressForm.control}
        name="address.city"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="col-span-4">
            <FieldLabel htmlFor="city">Cidade</FieldLabel>
            <Input
              {...field}
              id="city"
              autoComplete="address-level2"
              placeholder="São Paulo"
              aria-invalid={fieldState.invalid}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={addressForm.control}
        name="address.state"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="col-span-2">
            <FieldLabel htmlFor="state">UF</FieldLabel>
            <Select value={field.value || null} onValueChange={(value) => field.onChange(value ?? '')}>
              <SelectTrigger
                ref={field.ref}
                id="state"
                className="w-full"
                aria-invalid={fieldState.invalid}
                onBlur={field.onBlur}
              >
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {BRAZILIAN_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
    </div>
  );
}
