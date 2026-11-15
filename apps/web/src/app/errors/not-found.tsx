import { Button } from '@packages/ui/components/button';
import { Link } from 'react-router';

export function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Página não encontrada</h1>
      <p className="text-sm text-muted-foreground">O endereço que você tentou acessar não existe.</p>
      <Button nativeButton={false} render={<Link to="/" />}>
        Voltar ao início
      </Button>
    </main>
  );
}
