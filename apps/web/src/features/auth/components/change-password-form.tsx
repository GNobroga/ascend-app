import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { PasswordInput } from '@packages/ui/components/password-input';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CircleAlertIcon } from 'lucide-react';
import { Controller, useForm, useFormState } from 'react-hook-form';
import { userQueries } from '@/features/users';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { useChangePassword } from '../api/auth.mutations';
import { createChangePasswordSchema, type ChangePasswordValues } from '../schemas';

const EMPTY_VALUES: ChangePasswordValues = { currentPassword: '', password: '', passwordConfirmation: '' };

export function ChangePasswordForm() {
  const { data: user } = useSuspenseQuery(userQueries.me());
  return <PasswordForm key={String(user.hasPassword)} hasPassword={user.hasPassword} />;
}

type PasswordFormProps = {
  hasPassword: boolean;
};

function PasswordForm({ hasPassword }: PasswordFormProps) {
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(createChangePasswordSchema(hasPassword)),
    defaultValues: EMPTY_VALUES,
  });
  const { errors } = useFormState({ control: form.control });
  const changePassword = useChangePassword({
    onError: (error) => {
      if (hasErrorCode(error, ErrorCode.INVALID_CURRENT_PASSWORD)) {
        form.setError('currentPassword', { message: error.message }, { shouldFocus: true });
        return;
      }
      applyApiErrors(form, error);
    },
  });

  const onSubmit = form.handleSubmit(({ currentPassword, password }) => {
    changePassword.mutate(
      { currentPassword: hasPassword ? currentPassword : undefined, newPassword: password },
      {
        onSuccess: () => {
          form.reset(EMPTY_VALUES);
          toast.success(hasPassword ? 'Senha alterada.' : 'Senha criada.');
        },
      },
    );
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

        {hasPassword ? (
          <Controller
            control={form.control}
            name="currentPassword"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="current-password">Senha atual</FieldLabel>
                <PasswordInput
                  {...field}
                  id="current-password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="sm:max-w-sm"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        ) : (
          <FieldDescription>
            Você entra com o Google. Crie uma senha para também entrar com seu e-mail.
          </FieldDescription>
        )}

        <Controller
          control={form.control}
          name="password"
          rules={{ deps: ['passwordConfirmation'] }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="new-password">Nova senha</FieldLabel>
              <PasswordInput
                {...field}
                id="new-password"
                autoComplete="new-password"
                placeholder="••••••••"
                className="sm:max-w-sm"
                aria-invalid={fieldState.invalid}
                aria-describedby="new-password-hint"
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <FieldDescription id="new-password-hint">Use pelo menos 8 caracteres.</FieldDescription>
              )}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="passwordConfirmation"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="new-password-confirmation">Confirmar nova senha</FieldLabel>
              <PasswordInput
                {...field}
                id="new-password-confirmation"
                autoComplete="new-password"
                placeholder="••••••••"
                className="sm:max-w-sm"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <FieldDescription>Por segurança, as sessões em outros dispositivos serão encerradas.</FieldDescription>

        <div>
          <Button type="submit" disabled={changePassword.isPending}>
            {changePassword.isPending && <Spinner />}
            {hasPassword ? 'Trocar senha' : 'Criar senha'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
