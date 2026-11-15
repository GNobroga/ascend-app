import { z } from 'zod';
import { onlyDigits } from '@/shared/lib/masks';

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Informe seu nome.').max(255, 'O nome deve ter no máximo 255 caracteres.'),
  phone: z
    .string()
    .refine((value) => value === '' || [10, 11].includes(onlyDigits(value).length), 'Informe um telefone com DDD.'),
});

export type ProfileValues = z.infer<typeof profileSchema>;
