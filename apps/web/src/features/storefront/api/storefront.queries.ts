import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { storefrontApi, type PublicAvailabilityQuery } from './storefront.api';

export const storefrontQueries = {
  all: (slug: string) => ['storefront', slug] as const,
  business: (slug: string) =>
    queryOptions({
      queryKey: [...storefrontQueries.all(slug), 'business'],
      queryFn: () => storefrontApi.getBusiness(slug),
    }),
  catalog: (slug: string) =>
    queryOptions({
      queryKey: [...storefrontQueries.all(slug), 'catalog'],
      queryFn: () => storefrontApi.getCatalog(slug),
    }),
  professionals: (slug: string, serviceId: string | null = null) =>
    queryOptions({
      queryKey: [...storefrontQueries.all(slug), 'professionals', serviceId],
      queryFn: () => storefrontApi.listProfessionals(slug, serviceId),
    }),
  reviews: (slug: string) =>
    infiniteQueryOptions({
      queryKey: [...storefrontQueries.all(slug), 'reviews'],
      queryFn: ({ pageParam }) => storefrontApi.listReviews(slug, pageParam),
      initialPageParam: null as string | null,
      getNextPageParam: ({ meta }) => (meta.hasMore ? meta.nextCursor : null),
    }),
  ratings: (slug: string) =>
    queryOptions({
      queryKey: [...storefrontQueries.all(slug), 'ratings'],
      queryFn: () => storefrontApi.getRatings(slug),
    }),
  availability: (slug: string, query: PublicAvailabilityQuery) =>
    queryOptions({
      queryKey: [...storefrontQueries.all(slug), 'availability', query],
      queryFn: () => storefrontApi.getAvailability(slug, query),
      staleTime: 0,
    }),
};
