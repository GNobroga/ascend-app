import { infiniteQueryOptions, keepPreviousData, queryOptions } from '@tanstack/react-query';
import { reviewsApi, type ReviewListFilters } from './reviews.api';

export const reviewQueries = {
  all: (businessId: string) => ['reviews', businessId] as const,
  lists: (businessId: string) => [...reviewQueries.all(businessId), 'list'] as const,
  list: (businessId: string, filters: ReviewListFilters) =>
    infiniteQueryOptions({
      queryKey: [...reviewQueries.lists(businessId), filters],
      queryFn: ({ pageParam }) => reviewsApi.list(businessId, filters, pageParam),
      initialPageParam: null as string | null,
      getNextPageParam: ({ meta }) => (meta.hasMore ? meta.nextCursor : null),
      placeholderData: keepPreviousData,
    }),
  ratings: (businessId: string, slug: string) =>
    queryOptions({
      queryKey: [...reviewQueries.all(businessId), 'ratings', slug],
      queryFn: () => reviewsApi.ratings(slug),
    }),
};
