import { z } from 'zod';

export const MIN_SERVICE_DURATION = 5;

export const MAX_SERVICE_DURATION = 720;

const MAX_PRICE = 99_999_999.99;

const hasAtMostTwoDecimals = (value: number) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

export const serviceSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do serviço.').max(255, 'Use no máximo 255 caracteres.'),
  description: z.string().trim().max(2000, 'Use no máximo 2000 caracteres.'),
  categoryId: z.string(),
  durationInMinutes: z
    .number('Informe a duração.')
    .int('Use minutos inteiros.')
    .min(MIN_SERVICE_DURATION, `Use no mínimo ${MIN_SERVICE_DURATION} minutos.`)
    .max(MAX_SERVICE_DURATION, 'Use no máximo 12 horas.')
    .multipleOf(5, 'Use um múltiplo de 5 minutos.'),
  price: z
    .number('Informe o preço.')
    .min(0, 'O preço não pode ser negativo.')
    .max(MAX_PRICE, 'Valor muito alto.')
    .refine(hasAtMostTwoDecimals, 'Use no máximo 2 casas decimais.'),
  isActive: z.boolean(),
});

export type ServiceValues = z.infer<typeof serviceSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da categoria.').max(100, 'Use no máximo 100 caracteres.'),
  description: z.string().trim().max(255, 'Use no máximo 255 caracteres.'),
  isActive: z.boolean(),
});

export type CategoryValues = z.infer<typeof categorySchema>;

export const MIN_PACKAGE_SERVICES = 2;

export const MAX_PACKAGE_SERVICES = 10;

export const packageSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do pacote.').max(255, 'Use no máximo 255 caracteres.'),
  description: z.string().trim().max(2000, 'Use no máximo 2000 caracteres.'),
  serviceIds: z
    .array(z.string())
    .min(MIN_PACKAGE_SERVICES, `Escolha pelo menos ${MIN_PACKAGE_SERVICES} serviços.`)
    .max(MAX_PACKAGE_SERVICES, `Escolha no máximo ${MAX_PACKAGE_SERVICES} serviços.`),
  price: z
    .number('Informe o preço.')
    .min(0, 'O preço não pode ser negativo.')
    .max(MAX_PRICE, 'Valor muito alto.')
    .refine(hasAtMostTwoDecimals, 'Use no máximo 2 casas decimais.'),
  durationMinutes: z
    .number('Informe a duração.')
    .int('Use minutos inteiros.')
    .min(MIN_SERVICE_DURATION, `Use no mínimo ${MIN_SERVICE_DURATION} minutos.`)
    .max(MAX_SERVICE_DURATION, 'Use no máximo 12 horas.')
    .multipleOf(5, 'Use um múltiplo de 5 minutos.'),
  commissionMode: z.enum(['package', 'prorated']),
  isActive: z.boolean(),
});

export type PackageValues = z.infer<typeof packageSchema>;
