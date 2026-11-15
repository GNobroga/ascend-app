import { infiniteQueryOptions } from '@tanstack/react-query';
import { myAppointmentsApi, type MyAppointmentScope } from './my-appointments.api';

export const myAppointmentQueries = {
  all: () => ['me', 'appointments'] as const,
  list: (scope: MyAppointmentScope) =>
    infiniteQueryOptions({
      queryKey: [...myAppointmentQueries.all(), scope],
      queryFn: ({ pageParam }) => myAppointmentsApi.list(scope, pageParam),
      initialPageParam: 1,
      getNextPageParam: ({ meta }) => (meta.page < meta.totalPages ? meta.page + 1 : null),
    }),
};
