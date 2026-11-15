import { Button } from '@packages/ui/components/button';
import { CircleCheckIcon } from 'lucide-react';
import { Link } from 'react-router';

function EmailVerifiedPage() {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <CircleCheckIcon className="size-12 text-primary" />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">E-mail verificado</h1>
        <p className="text-sm text-muted-foreground">Tudo certo! Agora você já pode agendar online.</p>
      </div>
      <Button size="lg" className="w-full" nativeButton={false} render={<Link to="/" replace />}>
        Continuar
      </Button>
    </div>
  );
}

export { EmailVerifiedPage as Component };
