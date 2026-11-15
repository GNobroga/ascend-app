import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { PasswordInput } from '@packages/ui/components/password-input';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { CircleAlertIcon } from 'lucide-react';
import { Controller, useForm, useFormState } from 'react-hook-form';
import { useQueryStates } from 'nuqs';
import { useNavigate } from 'react-router';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { safeRedirectPath } from '@/shared/lib/redirect-path';
import { useRegister } from '../api/auth.mutations';
import { registerSchema, type RegisterValues } from '../schemas';
import { registerSearchParams } from '../search-params';

export function RegisterForm() {
  const navigate = useNavigate();
  const [{ redirectTo, email: invitedEmail }] = useQueryStates(registerSearchParams);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: invitedEmail ?? '', password: '', passwordConfirmation: '' },
  });
  const { errors } = useFormState({ control: form.control });
  const register = useRegister({
    onError: (error) => {
      if (hasErrorCode(error, ErrorCode.EMAIL_ALREADY_IN_USE)) {
        form.setError('email', { message: error.message }, { shouldFocus: true });
        return;
      }
      applyApiErrors(form, error);
    },
  });

  const onSubmit = form.handleSubmit(({ name, email, password }) => {
    register.mutate({ name, email, password }, {
      onSuccess: (user) => {
        toast.success('Conta criada!', {
          description: `Enviamos um link de verificação para ${user.email}.`,
        });
        void navigate(safeRedirectPath(redirectTo), { replace: true });
      },
    });
  });

  const serverError = errors.root?.server?.message;

  return (
    <form noValidate onSubmit={onSubmit}>
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
              <FieldLabel htmlFor="name">Nome</FieldLabel>
              <Input
                {...field}
                id="name"
                autoComplete="name"
                placeholder="Maria Silva"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input
                {...field}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="password"
          rules={{ deps: ['passwordConfirmation'] }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <PasswordInput
                {...field}
                id="password"
                autoComplete="new-password"
                placeholder="••••••••"
                aria-invalid={fieldState.invalid}
                aria-describedby="password-hint"
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <FieldDescription id="password-hint">Use pelo menos 8 caracteres.</FieldDescription>
              )}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="passwordConfirmation"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password-confirmation">Confirmar senha</FieldLabel>
              <PasswordInput
                {...field}
                id="password-confirmation"
                autoComplete="new-password"
                placeholder="••••••••"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Button type="submit" size="lg" disabled={register.isPending}>
          {register.isPending && <Spinner />}
          Criar conta
        </Button>
      </FieldGroup>
    </form>
  );
}
