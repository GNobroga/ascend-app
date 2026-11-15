import { queryOptions } from '@tanstack/react-query';
import { postalCodesApi } from './postal-codes.api';

export const postalCodeQueries = {
  all: () => ['postal-codes'] as const,
  detail: (postalCode: string) =>
    queryOptions({
      queryKey: [...postalCodeQueries.all(), postalCode],
      queryFn: () => postalCodesApi.lookup(postalCode),
      staleTime: Infinity,
      retry: false,
    }),
};
