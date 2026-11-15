import type { BusinessMember, BusinessMemberRole, BusinessMemberStatus, MyBusiness } from '@/features/businesses';
import { api } from '@/shared/api/http';
import type { BusinessInvitation, InvitationPreview } from '../types';

export type UpdateMemberRequest = {
  roles?: BusinessMemberRole[];
  status?: BusinessMemberStatus;
};

export type CreateInvitationRequest = {
  email: string;
  roles: BusinessMemberRole[];
};

export type InvitationTokenRequest = {
  token: string;
};

const membersPath = (businessId: string) => `/businesses/${businessId}/members`;

const invitationsPath = (businessId: string) => `/businesses/${businessId}/invitations`;

export const teamApi = {
  updateMember: (businessId: string, memberId: string, body: UpdateMemberRequest) =>
    api.patch<BusinessMember>(`${membersPath(businessId)}/${memberId}`, body),
  removeMember: (businessId: string, memberId: string) => api.delete<void>(`${membersPath(businessId)}/${memberId}`),
  listInvitations: (businessId: string) => api.get<BusinessInvitation[]>(invitationsPath(businessId)),
  createInvitation: (businessId: string, body: CreateInvitationRequest) =>
    api.post<BusinessInvitation>(invitationsPath(businessId), body),
  resendInvitation: (businessId: string, invitationId: string) =>
    api.post<BusinessInvitation>(`${invitationsPath(businessId)}/${invitationId}/resend`),
  revokeInvitation: (businessId: string, invitationId: string) =>
    api.delete<void>(`${invitationsPath(businessId)}/${invitationId}`),
  lookupInvitation: (body: InvitationTokenRequest) => api.post<InvitationPreview>('/invitations/lookup', body),
  acceptInvitation: (body: InvitationTokenRequest) => api.post<MyBusiness>('/invitations/accept', body),
  declineInvitation: (body: InvitationTokenRequest) => api.post<void>('/invitations/decline', body),
};
