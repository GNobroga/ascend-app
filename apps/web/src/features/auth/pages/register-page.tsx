import { FieldSeparator } from '@packages/ui/components/field';
import { useQueryStates } from 'nuqs';
import { Link } from 'react-router';
import { withRedirectTo } from '@/shared/lib/redirect-path';
import { GoogleSignInButton } from '../components/google-sign-in-button';
import { RegisterForm } from '../components/register-form';
import { registerSearchParams } from '../search-params';

function RegisterPage() {
  const [{ redirectTo }] = useQueryStates(registerSearchParams);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Crie sua conta</h1>
        <p className="text-sm text-muted-foreground">Comece a organizar sua agenda em poucos minutos.</p>
      </div>

      <GoogleSignInButton redirectTo={redirectTo} />

      <FieldSeparator>ou</FieldSeparator>

      <RegisterForm />

      <p className="text-center text-sm text-muted-foreground">
        Já tem uma conta?{' '}
        <Link to={withRedirectTo('/login', redirectTo)} className="font-medium text-foreground underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}

export { RegisterPage as Component };
