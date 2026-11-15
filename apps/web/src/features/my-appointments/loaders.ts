import { redirect, type LoaderFunctionArgs } from 'react-router';
import { prefetch, queryClient } from '@/app/query-client';
import { myAppointmentsApi } from './api/my-appointments.api';
import { myAppointmentQueries } from './api/my-appointments.queries';
import { loadMyAppointmentsSearchParams } from './search-params';

export const MY_APPOINTMENTS_PATH = '/me/appointments';

export const hasMyAppointments = async () => (await myAppointmentsApi.countAll()) > 0;

export const myAppointmentsLoader = async ({ params, request }: LoaderFunctionArgs) => {
  const { scope } = loadMyAppointmentsSearchParams(request);
  if (scope || !params.appointmentId) {
    prefetch(queryClient.infiniteQuery(myAppointmentQueries.list(scope ?? 'upcoming')));
    return null;
  }

  const [upcoming, past] = await Promise.all([
    queryClient.infiniteQuery(myAppointmentQueries.list('upcoming')),
    queryClient.infiniteQuery(myAppointmentQueries.list('past')),
  ]);

  const isIn = (pages: typeof upcoming) =>
    pages.pages.some((page) => page.data.some(({ id }) => id === params.appointmentId));

  if (!isIn(upcoming) && isIn(past)) {
    const url = new URL(request.url);
    url.searchParams.set('scope', 'past');
    throw redirect(url.pathname + url.search);
  }
  return null;
};
