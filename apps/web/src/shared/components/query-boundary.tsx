import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { CircleAlertIcon, RotateCwIcon } from 'lucide-react';
import { Suspense, type ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { isApiError } from '@/shared/api/api-error';

type QueryBoundaryProps = {
  fallback: ReactNode;
  children: ReactNode;
};

export function QueryBoundary({ fallback, children }: QueryBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={QueryBoundaryError}>
          <Suspense fallback={fallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function QueryBoundaryError({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-6 text-center text-sm text-muted-foreground">
        <CircleAlertIcon className="size-5" aria-hidden />
        {isApiError(error) ? error.message : 'Não foi possível carregar esta parte da página.'}
        <Button type="button" variant="outline" size="sm" onClick={resetErrorBoundary}>
          <RotateCwIcon />
          Tentar de novo
        </Button>
      </CardContent>
    </Card>
  );
}
