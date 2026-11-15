import { z } from 'zod';

export const BOOKING_MODES = ['services', 'package'] as const;

export type BookingMode = (typeof BOOKING_MODES)[number];

export const ANY_PROFESSIONAL = '';

export const onlineBookingSchema = z
  .object({
    mode: z.enum(BOOKING_MODES),
    serviceIds: z.array(z.string()).max(10, 'Escolha no máximo 10 serviços.'),
    packageId: z.string(),
    professionalId: z.string(),
    date: z.string().min(1, 'Escolha o dia.'),
    startAt: z.string().min(1, 'Escolha um horário.'),
    customerNotes: z.string().trim().max(1000, 'Use no máximo 1000 caracteres.'),
  })
  .superRefine((values, context) => {
    if (values.mode === 'services' && values.serviceIds.length === 0) {
      context.addIssue({ code: 'custom', path: ['serviceIds'], message: 'Escolha ao menos um serviço.' });
    }
    if (values.mode === 'package' && !values.packageId) {
      context.addIssue({ code: 'custom', path: ['packageId'], message: 'Escolha o pacote.' });
    }
  });

export type OnlineBookingValues = z.infer<typeof onlineBookingSchema>;
