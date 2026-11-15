import { useSuspenseQuery } from '@tanstack/react-query';
import { businessQueries, canManageBusiness } from '@/features/businesses';

export const useCanManageCatalog = (businessId: string) => {
  const { data: businesses } = useSuspenseQuery(businessQueries.mine());
  const roles = businesses.find(({ id }) => id === businessId)?.roles ?? [];
  return canManageBusiness(roles);
};
