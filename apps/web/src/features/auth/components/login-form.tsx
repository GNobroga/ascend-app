import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { PasswordInput } from '@packages/ui/components/password-input';
import { Spinner } from '@packages/ui/components/spinner';
import { CircleAlertIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { Controller, useForm, useFormState } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { safeRedirectPath } from '@/shared/lib/redirect-path';
import { useLogin } from '../api/auth.mutations';
import { loginSchema, type LoginValues } from '../schemas';
import { loginSearchParams } from '../search-params';

export function LoginForm() {
  const navigate = useNavigate();
  const [{ redirectTo }, setSearchParams] = useQueryStates(loginSearchParams);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors } = useFormState({ control: form.control });
  const login = useLogin({ onError: (error) => applyApiErrors(form, error) });

  const onSubmit = form.handleSubmit((values) => {
    void setSearchParams({ error: null });
    login.mutate(values, {
      onSuccess: () => navigate(safeRedirectPath(redirectTo), { replace: true }),
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
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="password">Senha</FieldLabel>
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <PasswordInput
                {...field}
                id="password"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Button type="submit" size="lg" disabled={login.isPending}>
          {login.isPending && <Spinner />}
          Entrar
        </Button>
      </FieldGroup>
    </form>
  );
}
