import { z } from 'zod';

export const REPLY_MAX_LENGTH = 2000;

export const reviewReplySchema = z.object({
  reply: z
    .string()
    .trim()
    .min(1, 'Escreva a resposta.')
    .max(REPLY_MAX_LENGTH, `Use no máximo ${REPLY_MAX_LENGTH} caracteres.`),
});

export type ReviewReplyValues = z.infer<typeof reviewReplySchema>;
