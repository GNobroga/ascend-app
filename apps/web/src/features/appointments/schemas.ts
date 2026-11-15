import { z } from 'zod';

export const BOOKING_MODES = ['services', 'package'] as const;

export type BookingMode = (typeof BOOKING_MODES)[number];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const newAppointmentSchema = z
  .object({
    customerId: z.string().min(1, 'Escolha o cliente.'),
    mode: z.enum(BOOKING_MODES),
    serviceIds: z.array(z.string()).max(10, 'Escolha no máximo 10 serviços.'),
    packageId: z.string(),
    professionalId: z.string().min(1, 'Escolha o profissional.'),
    date: z.string().regex(DATE_PATTERN, 'Escolha o dia.'),
    time: z.string().regex(TIME_PATTERN, 'Escolha um horário.'),
    internalNotes: z.string().trim().max(1000, 'Use no máximo 1000 caracteres.'),
  })
  .superRefine((values, context) => {
    if (values.mode === 'services' && values.serviceIds.length === 0) {
      context.addIssue({ code: 'custom', path: ['serviceIds'], message: 'Escolha ao menos um serviço.' });
    }
    if (values.mode === 'package' && !values.packageId) {
      context.addIssue({ code: 'custom', path: ['packageId'], message: 'Escolha o pacote.' });
    }
  });

export type NewAppointmentValues = z.infer<typeof newAppointmentSchema>;

export const rescheduleSchema = z.object({
  professionalId: z.string().min(1, 'Escolha o profissional.'),
  date: z.string().regex(DATE_PATTERN, 'Escolha o dia.'),
  time: z.string().regex(TIME_PATTERN, 'Escolha um horário.'),
});

export type RescheduleValues = z.infer<typeof rescheduleSchema>;

const hasAtMostTwoDecimals = (value: number) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

export const createPaymentSchema = (balance: number, balanceLabel: string, today: string) =>
  z.object({
    paidOn: z
      .string()
      .regex(DATE_PATTERN, 'Informe a data do recebimento.')
      .refine((value) => value <= today, 'A data do recebimento não pode estar no futuro.'),
    paymentMethodId: z.string().min(1, 'Escolha a forma de pagamento.'),
    amount: z
      .number('Informe o valor.')
      .min(0.01, 'Informe um valor maior que zero.')
      .max(balance, `O valor passa do que falta receber (${balanceLabel}).`)
      .refine(hasAtMostTwoDecimals, 'Use no máximo 2 casas decimais.'),
    notes: z.string().trim().max(1000, 'Use no máximo 1000 caracteres.'),
  });

export type PaymentValues = z.infer<ReturnType<typeof createPaymentSchema>>;
