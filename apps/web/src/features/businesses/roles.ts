import { BusinessMemberRole } from './types';

const ROLE_PRIORITY: BusinessMemberRole[] = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.PROFESSIONAL,
];

export const ROLE_LABELS: Record<BusinessMemberRole, string> = {
  [BusinessMemberRole.OWNER]: 'Proprietário',
  [BusinessMemberRole.ADMIN]: 'Administrador',
  [BusinessMemberRole.PROFESSIONAL]: 'Profissional',
};

export const hasAnyRole = (roles: BusinessMemberRole[], allowed: BusinessMemberRole[]) =>
  roles.some((role) => allowed.includes(role));

export const canManageBusiness = (roles: BusinessMemberRole[]) =>
  hasAnyRole(roles, [BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN]);

export const primaryRoleLabel = (roles: BusinessMemberRole[]) => {
  const role = ROLE_PRIORITY.find((candidate) => roles.includes(candidate));
  return role ? ROLE_LABELS[role] : null;
};
