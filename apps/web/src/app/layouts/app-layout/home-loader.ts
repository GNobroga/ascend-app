import { redirect } from 'react-router';
import { businessIndexLoader, businessQueries } from '@/features/businesses';
import { hasMyAppointments, MY_APPOINTMENTS_PATH } from '@/features/my-appointments';
import { queryClient } from '../../query-client';

export const homeLoader = async () => {
  const businesses = await queryClient.query(businessQueries.mine());
  if (businesses.length === 0 && (await hasMyAppointments())) throw redirect(MY_APPOINTMENTS_PATH);

  return businessIndexLoader();
};
