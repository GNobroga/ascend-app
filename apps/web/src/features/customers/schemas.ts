import { z } from 'zod';
import { onlyDigits } from '@/shared/lib/masks';
import { CustomerBlockType } from './types';

export const customerSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').max(255, 'Use no máximo 255 caracteres.'),
  phone: z
    .string()
    .refine((value) => value === '' || [10, 11].includes(onlyDigits(value).length), 'Informe um telefone com DDD.'),
  email: z.union([z.literal(''), z.email('Informe um e-mail válido.').max(320, 'Use no máximo 320 caracteres.')]),
  notes: z.string().trim().max(2000, 'Use no máximo 2000 caracteres.'),
  whatsappOptOut: z.boolean(),
});

export type CustomerValues = z.infer<typeof customerSchema>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const blockCustomerSchema = z
  .object({
    type: z.enum(CustomerBlockType),
    until: z.string(),
    reason: z.string().trim().max(1000, 'Use no máximo 1000 caracteres.'),
  })
  .superRefine((values, context) => {
    if (values.type === CustomerBlockType.TEMPORARY && !DATE_PATTERN.test(values.until)) {
      context.addIssue({ code: 'custom', path: ['until'], message: 'Escolha até quando vale o bloqueio.' });
    }
  });

export type BlockCustomerValues = z.infer<typeof blockCustomerSchema>;

export const unblockFeeSchema = z.object({
  paymentMethodId: z.string().min(1, 'Escolha a forma de pagamento.'),
  notes: z.string().trim().max(1000, 'Use no máximo 1000 caracteres.'),
});

export type UnblockFeeValues = z.infer<typeof unblockFeeSchema>;
