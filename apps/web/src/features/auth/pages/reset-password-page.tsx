import { Button } from '@packages/ui/components/button';
import { CircleCheckIcon, LinkIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useState } from 'react';
import { Link } from 'react-router';
import { ResetPasswordForm } from '../components/reset-password-form';
import { resetPasswordSearchParams } from '../search-params';

function ResetPasswordPage() {
  const [{ token }] = useQueryStates(resetPasswordSearchParams);
  const [isReset, setIsReset] = useState(false);

  if (isReset) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <CircleCheckIcon className="size-12 text-primary" />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Senha redefinida</h1>
          <p className="text-sm text-muted-foreground">
            Por segurança, encerramos todas as suas sessões. Entre novamente com a nova senha.
          </p>
        </div>
        <Button size="lg" className="w-full" nativeButton={false} render={<Link to="/login" replace />}>
          Ir para o login
        </Button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <LinkIcon className="size-12 text-muted-foreground" />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Link inválido</h1>
          <p className="text-sm text-muted-foreground">
            Este link de redefinição está incompleto. Solicite um novo para continuar.
          </p>
        </div>
        <Button size="lg" className="w-full" nativeButton={false} render={<Link to="/forgot-password" />}>
          Solicitar novo link
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Crie uma nova senha</h1>
        <p className="text-sm text-muted-foreground">Escolha uma senha que você ainda não tenha usado aqui.</p>
      </div>

      <ResetPasswordForm token={token} onReset={() => setIsReset(true)} />

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}

export { ResetPasswordPage as Component };
