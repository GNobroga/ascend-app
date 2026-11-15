import { redirect, type LoaderFunctionArgs } from 'react-router';
import { prefetch, queryClient } from '@/app/query-client';
import { businessPath, businessQueries } from '@/features/businesses';
import { catalogQueries } from '@/features/catalog';
import { professionalQueries } from '@/features/professionals';
import { userQueries } from '@/features/users';
import { appointmentQueries } from './api/appointments.queries';
import { fetchRange, fromDateKey, todayKey } from './calendar';
import { loadAppointmentsSearchParams } from './search-params';

export const appointmentsPath = (businessId: string) => `${businessPath(businessId)}/appointments`;

export const appointmentsLoader = async ({ params, request }: LoaderFunctionArgs) => {
  const { businessId } = params;
  if (!businessId) throw redirect('/');

  prefetch(queryClient.query(catalogQueries.services(businessId)));
  prefetch(queryClient.query(catalogQueries.packages(businessId)));

  const { view, date } = loadAppointmentsSearchParams(request);
  const { timezone } = await queryClient.query(businessQueries.detail(businessId));
  const range = fetchRange(view, fromDateKey(date ?? todayKey(timezone), timezone));
  prefetch(queryClient.query(appointmentQueries.list(businessId, range)));

  await Promise.all([
    queryClient.query(professionalQueries.list(businessId)),
    queryClient.query(businessQueries.members(businessId)),
    queryClient.query(businessQueries.hours(businessId)),
    queryClient.query(businessQueries.mine()),
    queryClient.query(userQueries.me()),
  ]);
  return null;
};
