import { toast } from '@packages/ui/components/sonner';
import { MutationCache, QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/shared/api/api-error';

const MAX_QUERY_RETRIES = 3;

const isClientError = (error: unknown) => isApiError(error) && error.statusCode >= 400 && error.statusCode < 500;

export const prefetch = (pending: Promise<unknown>) => {
  pending.catch(() => undefined);
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => !isClientError(error) && failureCount < MAX_QUERY_RETRIES,
    },
    mutations: {
      retry: false,
    },
  },
  mutationCache: new MutationCache({
    onError: (error, _variables, _onMutateResult, mutation) => {
      if (mutation.options.onError) return;
      toast.error(isApiError(error) ? error.message : 'Ocorreu um erro inesperado. Tente novamente.');
    },
  }),
});
