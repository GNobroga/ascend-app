import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { PasswordInput } from '@packages/ui/components/password-input';
import { Spinner } from '@packages/ui/components/spinner';
import { CircleAlertIcon } from 'lucide-react';
import { Controller, useForm, useFormState } from 'react-hook-form';
import { Link } from 'react-router';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { useResetPassword } from '../api/auth.mutations';
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas';

type ResetPasswordFormProps = {
  token: string;
  onReset: () => void;
};

export function ResetPasswordForm({ token, onReset }: ResetPasswordFormProps) {
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', passwordConfirmation: '' },
  });
  const { errors } = useFormState({ control: form.control });
  const resetPassword = useResetPassword({ onError: (error) => applyApiErrors(form, error) });

  const onSubmit = form.handleSubmit(({ password }) => {
    resetPassword.mutate({ token, password }, { onSuccess: onReset });
  });

  const isInvalidToken = hasErrorCode(resetPassword.error, ErrorCode.INVALID_RESET_TOKEN);
  const serverError = errors.root?.server?.message;

  return (
    <form noValidate onSubmit={onSubmit}>
      <FieldGroup>
        {serverError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>
              <p>{serverError}</p>
              {isInvalidToken && (
                <Link to="/forgot-password" className="font-medium">
                  Solicitar um novo link
                </Link>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Controller
          control={form.control}
          name="password"
          rules={{ deps: ['passwordConfirmation'] }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password">Nova senha</FieldLabel>
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
              <FieldLabel htmlFor="password-confirmation">Confirmar nova senha</FieldLabel>
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

        <Button type="submit" size="lg" disabled={resetPassword.isPending}>
          {resetPassword.isPending && <Spinner />}
          Redefinir senha
        </Button>
      </FieldGroup>
    </form>
  );
}
