import { queryOptions } from '@tanstack/react-query';
import type { ImageOwner } from '../types';
import { catalogApi } from './catalog.api';

export const catalogQueries = {
  all: (businessId: string) => ['catalog', businessId] as const,
  services: (businessId: string) =>
    queryOptions({
      queryKey: [...catalogQueries.all(businessId), 'services'],
      queryFn: () => catalogApi.listServices(businessId),
    }),
  categories: (businessId: string) =>
    queryOptions({
      queryKey: [...catalogQueries.all(businessId), 'categories'],
      queryFn: () => catalogApi.listCategories(businessId),
    }),
  packages: (businessId: string) =>
    queryOptions({
      queryKey: [...catalogQueries.all(businessId), 'packages'],
      queryFn: () => catalogApi.listPackages(businessId),
    }),
  images: (businessId: string, owner: ImageOwner) =>
    queryOptions({
      queryKey: [...catalogQueries.all(businessId), owner.kind, owner.id, 'images'],
      queryFn: () => catalogApi.listImages(businessId, owner),
    }),
};
