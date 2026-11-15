import { redirect, type LoaderFunctionArgs } from 'react-router';
import { prefetch, queryClient } from '@/app/query-client';
import { businessPath, businessQueries, canManageBusiness } from '@/features/businesses';
import { userQueries } from '@/features/users';
import { teamQueries } from './api/team.queries';

export const teamPath = (businessId: string) => `${businessPath(businessId)}/team`;

export const teamLoader = async ({ params }: LoaderFunctionArgs) => {
  const { businessId } = params;
  if (!businessId) throw redirect('/');

  const businesses = await queryClient.query(businessQueries.mine());
  const business = businesses.find(({ id }) => id === businessId);
  if (!business || !canManageBusiness(business.roles)) throw redirect(businessPath(businessId));

  prefetch(queryClient.query(businessQueries.members(businessId)));
  prefetch(queryClient.query(teamQueries.invitations(businessId)));
  await queryClient.query(userQueries.me());
  return null;
};

export const acceptInvitationLoader = ({ request }: LoaderFunctionArgs) => {
  const token = new URL(request.url).searchParams.get('token');
  prefetch(queryClient.query(userQueries.me()));
  if (token) prefetch(queryClient.query(teamQueries.invitationPreview(token)));
  return null;
};
