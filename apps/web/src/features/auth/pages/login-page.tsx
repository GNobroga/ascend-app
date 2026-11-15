import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { FieldSeparator } from '@packages/ui/components/field';
import { CircleAlertIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { Link } from 'react-router';
import { ErrorCode } from '@/shared/api/error-code';
import { withRedirectTo } from '@/shared/lib/redirect-path';
import { GoogleSignInButton } from '../components/google-sign-in-button';
import { LoginForm } from '../components/login-form';
import { loginSearchParams } from '../search-params';

const loginErrorMessages: Partial<Record<string, string>> = {
  [ErrorCode.OAUTH_DENIED]: 'O acesso pelo Google foi cancelado.',
  [ErrorCode.OAUTH_STATE_MISMATCH]: 'A tentativa de login expirou. Tente novamente.',
  [ErrorCode.GOOGLE_EMAIL_NOT_VERIFIED]: 'O e-mail da sua conta Google ainda não foi verificado.',
  [ErrorCode.EMAIL_ALREADY_IN_USE]: 'Já existe uma conta com este e-mail. Entre com sua senha.',
  [ErrorCode.INVALID_VERIFICATION_TOKEN]: 'O link de verificação é inválido ou expirou.',
};

const GOOGLE_FALLBACK_ERROR = 'Não foi possível entrar com o Google. Tente novamente.';

function LoginPage() {
  const [{ error, redirectTo }] = useQueryStates(loginSearchParams);
  const loginError = error ? (loginErrorMessages[error] ?? GOOGLE_FALLBACK_ERROR) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h1>
        <p className="text-sm text-muted-foreground">Entre na sua conta para gerenciar sua agenda.</p>
      </div>

      {loginError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{loginError}</AlertDescription>
        </Alert>
      )}

      <GoogleSignInButton redirectTo={redirectTo} />

      <FieldSeparator>ou</FieldSeparator>

      <LoginForm />

      <p className="text-center text-sm text-muted-foreground">
        Não tem uma conta?{' '}
        <Link to={withRedirectTo('/register', redirectTo)} className="font-medium text-foreground underline-offset-4 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}

export { LoginPage as Component };
