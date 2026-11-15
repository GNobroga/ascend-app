import { infiniteQueryOptions, keepPreviousData, queryOptions } from '@tanstack/react-query';
import { AppointmentStatus } from '../types';
import { appointmentsApi, type AppointmentRange, type AvailabilityQuery } from './appointments.api';
import { paymentsApi } from './payments.api';

export const appointmentQueries = {
  all: (businessId: string) => ['appointments', businessId] as const,
  lists: (businessId: string) => [...appointmentQueries.all(businessId), 'list'] as const,
  list: (businessId: string, range: AppointmentRange) =>
    queryOptions({
      queryKey: [...appointmentQueries.lists(businessId), range],
      queryFn: () => appointmentsApi.list(businessId, range),
      placeholderData: keepPreviousData,
    }),
  pending: (businessId: string, range: AppointmentRange) =>
    queryOptions({
      queryKey: [...appointmentQueries.lists(businessId), 'pending', range],
      queryFn: () => appointmentsApi.list(businessId, range, AppointmentStatus.PENDING),
    }),
  byCustomer: (businessId: string, customerId: string, status: AppointmentStatus | null) =>
    infiniteQueryOptions({
      queryKey: [...appointmentQueries.lists(businessId), 'customer', customerId, status],
      queryFn: ({ pageParam }) => appointmentsApi.listByCustomer(businessId, customerId, status, pageParam),
      initialPageParam: 1,
      getNextPageParam: ({ meta }) => (meta.page < meta.totalPages ? meta.page + 1 : null),
      placeholderData: keepPreviousData,
    }),
  customerSummary: (businessId: string, customerId: string) =>
    queryOptions({
      queryKey: [...appointmentQueries.lists(businessId), 'customer', customerId, 'summary'],
      queryFn: () => appointmentsApi.summarizeByCustomer(businessId, customerId),
    }),
  detail: (businessId: string, appointmentId: string) =>
    queryOptions({
      queryKey: [...appointmentQueries.all(businessId), 'detail', appointmentId],
      queryFn: () => appointmentsApi.getById(businessId, appointmentId),
    }),
  payments: (businessId: string, appointmentId: string) =>
    queryOptions({
      queryKey: [...appointmentQueries.all(businessId), 'detail', appointmentId, 'payments'],
      queryFn: () => paymentsApi.list(businessId, appointmentId),
    }),
  availability: (businessId: string, query: AvailabilityQuery) =>
    queryOptions({
      queryKey: [...appointmentQueries.all(businessId), 'availability', query],
      queryFn: () => appointmentsApi.availability(businessId, query),
      staleTime: 0,
    }),
};
