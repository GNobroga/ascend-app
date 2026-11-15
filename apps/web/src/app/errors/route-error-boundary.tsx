import { Button } from '@packages/ui/components/button';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { isApiError } from '@/shared/api/api-error';
import { NotFound } from './not-found';

export function RouteErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;

  const message = isApiError(error) ? error.message : 'Ocorreu um erro inesperado. Tente novamente.';

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Algo deu errado</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button type="button" onClick={() => window.location.reload()}>
        Tentar novamente
      </Button>
    </main>
  );
}
