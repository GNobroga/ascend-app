import { useSuspenseQuery } from '@tanstack/react-query';
import { businessQueries } from '../api/businesses.queries';

export const useBusinessTimezone = (businessId: string) =>
  useSuspenseQuery({ ...businessQueries.detail(businessId), select: (business) => business.timezone }).data;
