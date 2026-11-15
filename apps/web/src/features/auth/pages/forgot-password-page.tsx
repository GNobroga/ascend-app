import { Button } from '@packages/ui/components/button';
import { MailCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { ForgotPasswordForm } from '../components/forgot-password-form';

function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <MailCheckIcon className="size-12 text-primary" />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Verifique seu e-mail</h1>
          <p className="text-sm text-muted-foreground">
            Se existir uma conta com <span className="font-medium text-foreground">{sentTo}</span>, você vai
            receber um link para redefinir a senha em instantes.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Button size="lg" nativeButton={false} render={<Link to="/login" />}>
            Voltar para o login
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => setSentTo(null)}>
            Usar outro e-mail
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Esqueceu a senha?</h1>
        <p className="text-sm text-muted-foreground">
          Informe seu e-mail e enviaremos um link para você criar uma nova senha.
        </p>
      </div>

      <ForgotPasswordForm onSent={setSentTo} />

      <p className="text-center text-sm text-muted-foreground">
        Lembrou a senha?{' '}
        <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}

export { ForgotPasswordPage as Component };
