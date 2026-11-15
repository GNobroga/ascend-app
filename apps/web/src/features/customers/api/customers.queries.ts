import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { customersApi, type CustomerListFilters } from './customers.api';

export const customerQueries = {
  all: (businessId: string) => ['customers', businessId] as const,
  lists: (businessId: string) => [...customerQueries.all(businessId), 'list'] as const,
  list: (businessId: string, filters: CustomerListFilters) =>
    queryOptions({
      queryKey: [...customerQueries.lists(businessId), filters],
      queryFn: () => customersApi.list(businessId, filters),
      placeholderData: keepPreviousData,
    }),
  detail: (businessId: string, customerId: string) =>
    queryOptions({
      queryKey: [...customerQueries.all(businessId), 'detail', customerId],
      queryFn: () => customersApi.getById(businessId, customerId),
    }),
  possibleDuplicates: (businessId: string) =>
    queryOptions({
      queryKey: [...customerQueries.all(businessId), 'possible-duplicates'],
      queryFn: () => customersApi.listPossibleDuplicates(businessId),
    }),
};
