import { z } from 'zod';
import { BusinessMemberRole } from '@/features/businesses';

const roles = z.array(z.enum(BusinessMemberRole)).min(1, 'Escolha ao menos um papel.');

export const inviteSchema = z.object({
  email: z.email('Informe um e-mail válido.').max(320, 'Use no máximo 320 caracteres.'),
  roles,
});

export type InviteValues = z.infer<typeof inviteSchema>;

export const memberRolesSchema = z.object({
  roles,
});

export type MemberRolesValues = z.infer<typeof memberRolesSchema>;
