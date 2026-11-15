import { queryOptions } from '@tanstack/react-query';
import { teamApi } from './team.api';

export const teamQueries = {
  all: () => ['team'] as const,
  invitations: (businessId: string) =>
    queryOptions({
      queryKey: [...teamQueries.all(), businessId, 'invitations'],
      queryFn: () => teamApi.listInvitations(businessId),
    }),
  invitationPreview: (token: string) =>
    queryOptions({
      queryKey: [...teamQueries.all(), 'invitation-preview', token],
      queryFn: () => teamApi.lookupInvitation({ token }),
      retry: false,
    }),
};
