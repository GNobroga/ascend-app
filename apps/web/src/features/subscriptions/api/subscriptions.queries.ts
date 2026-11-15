import { queryOptions } from '@tanstack/react-query';
import { subscriptionsApi } from './subscriptions.api';

export const subscriptionQueries = {
  all: () => ['subscriptions'] as const,
  byBusiness: (businessId: string) =>
    queryOptions({
      queryKey: [...subscriptionQueries.all(), businessId],
      queryFn: () => subscriptionsApi.getByBusiness(businessId),
    }),
};
