import { BusinessMemberRole, ROLE_LABELS } from '@/features/businesses';

export type RoleOption = {
  value: BusinessMemberRole;
  label: string;
  description: string;
};

export const ROLE_OPTIONS: RoleOption[] = [
  {
    value: BusinessMemberRole.OWNER,
    label: ROLE_LABELS[BusinessMemberRole.OWNER],
    description: 'Acesso total, inclusive à assinatura e a outros proprietários.',
  },
  {
    value: BusinessMemberRole.ADMIN,
    label: ROLE_LABELS[BusinessMemberRole.ADMIN],
    description: 'Gerencia o negócio, a equipe e a agenda, exceto proprietários.',
  },
  {
    value: BusinessMemberRole.PROFESSIONAL,
    label: ROLE_LABELS[BusinessMemberRole.PROFESSIONAL],
    description: 'Vê o negócio e cuida só dos próprios agendamentos.',
  },
];

export const roleLabels = (roles: BusinessMemberRole[]) =>
  ROLE_OPTIONS.filter(({ value }) => roles.includes(value)).map(({ label }) => label);

export const joinLabels = (labels: string[]) =>
  labels.length <= 1 ? (labels[0] ?? '') : `${labels.slice(0, -1).join(', ')} e ${labels.at(-1)}`;
