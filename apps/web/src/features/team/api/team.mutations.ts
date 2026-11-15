import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { businessQueries, type BusinessMember } from '@/features/businesses';
import { professionalQueries } from '@/features/professionals';
import { subscriptionQueries } from '@/features/subscriptions';
import { teamApi, type CreateInvitationRequest, type UpdateMemberRequest } from './team.api';
import { teamQueries } from './team.queries';

type MutationCallbacks = {
  onError?: (error: Error) => void;
};

type UpdateMemberVariables = {
  memberId: string;
  body: UpdateMemberRequest;
};

const invalidateMemberDependents = (queryClient: QueryClient, businessId: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: professionalQueries.all(businessId) }),
    queryClient.invalidateQueries({ queryKey: subscriptionQueries.byBusiness(businessId).queryKey }),
  ]);

export const useUpdateMember = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, body }: UpdateMemberVariables) => teamApi.updateMember(businessId, memberId, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(businessQueries.members(businessId).queryKey, (members: BusinessMember[] = []) =>
        members.map((member) => (member.id === updated.id ? updated : member)),
      );
      return invalidateMemberDependents(queryClient, businessId);
    },
    onError,
  });
};

export const useRemoveMember = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => teamApi.removeMember(businessId, memberId),
    onSuccess: (_result, memberId) => {
      queryClient.setQueryData(businessQueries.members(businessId).queryKey, (members: BusinessMember[] = []) =>
        members.filter((member) => member.id !== memberId),
      );
      return invalidateMemberDependents(queryClient, businessId);
    },
  });
};

const invalidateInvitations = (queryClient: QueryClient, businessId: string) =>
  queryClient.invalidateQueries({ queryKey: teamQueries.invitations(businessId).queryKey });

export const useCreateInvitation = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateInvitationRequest) => teamApi.createInvitation(businessId, body),
    onSuccess: () => invalidateInvitations(queryClient, businessId),
    onError,
  });
};

export const useResendInvitation = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => teamApi.resendInvitation(businessId, invitationId),
    onSuccess: () => invalidateInvitations(queryClient, businessId),
  });
};

export const useRevokeInvitation = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => teamApi.revokeInvitation(businessId, invitationId),
    onSuccess: () => invalidateInvitations(queryClient, businessId),
  });
};

export const useAcceptInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => teamApi.acceptInvitation({ token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessQueries.all() }),
  });
};

export const useDeclineInvitation = () =>
  useMutation({
    mutationFn: (token: string) => teamApi.declineInvitation({ token }),
  });
