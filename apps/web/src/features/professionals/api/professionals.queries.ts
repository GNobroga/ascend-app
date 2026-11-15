import { queryOptions } from '@tanstack/react-query';
import { professionalsApi } from './professionals.api';

export const professionalQueries = {
  all: (businessId: string) => ['professionals', businessId] as const,
  list: (businessId: string) =>
    queryOptions({
      queryKey: [...professionalQueries.all(businessId), 'list'],
      queryFn: () => professionalsApi.list(businessId),
    }),
  detail: (businessId: string, professionalId: string) =>
    queryOptions({
      queryKey: [...professionalQueries.all(businessId), 'detail', professionalId],
      queryFn: () => professionalsApi.getById(businessId, professionalId),
    }),
  workingHours: (businessId: string, professionalId: string) =>
    queryOptions({
      queryKey: [...professionalQueries.all(businessId), 'detail', professionalId, 'working-hours'],
      queryFn: () => professionalsApi.getWorkingHours(businessId, professionalId),
    }),
  specialties: (businessId: string) =>
    queryOptions({
      queryKey: [...professionalQueries.all(businessId), 'specialties'],
      queryFn: () => professionalsApi.listSpecialties(businessId),
    }),
  timeOffs: (businessId: string, professionalId: string) =>
    queryOptions({
      queryKey: [...professionalQueries.all(businessId), 'detail', professionalId, 'time-offs'],
      queryFn: () => professionalsApi.listTimeOffs(businessId, professionalId),
    }),
};
