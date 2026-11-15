import type { BusinessMemberRole } from '@/features/businesses';

export type BusinessInvitation = {
  id: string;
  email: string;
  roles: BusinessMemberRole[];
  invitedByName: string | null;
  expiresAt: string;
  isExpired: boolean;
  createdAt: string;
};

export type InvitationPreview = {
  businessName: string;
  businessSlug: string;
  businessLogoUrl: string | null;
  email: string;
  roles: BusinessMemberRole[];
  expiresAt: string;
};
