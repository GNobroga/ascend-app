import { z } from 'zod';
import { onlyDigits } from '@/shared/lib/masks';
import { isValidTaxId } from '@/shared/lib/tax-id';
import { isReservedSlug } from './reserved-slugs';
import { isSocialUrlValid, SOCIAL_NETWORK_CONFIG, SocialNetwork, toSocialUrl } from './social-networks';

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const requiredText = (message: string, max: number) =>
  z.string().trim().min(1, message).max(max, `Use no máximo ${max} caracteres.`);

export const addressSchema = z.object({
  postalCode: z.string().refine((value) => onlyDigits(value).length === 8, 'Informe um CEP com 8 dígitos.'),
  street: requiredText('Informe a rua.', 255),
  number: requiredText('Informe o número (ou S/N).', 20),
  complement: z.string().trim().max(255, 'Use no máximo 255 caracteres.'),
  district: requiredText('Informe o bairro.', 100),
  city: requiredText('Informe a cidade.', 100),
  state: z.string().refine((value) => BRAZILIAN_STATES.includes(value), 'Selecione o estado.'),
});

export type AddressValues = z.infer<typeof addressSchema>;

export type AddressFormValues = {
  address: AddressValues;
};

export const createBusinessSchema = z.object({
  name: requiredText('Informe o nome do negócio.', 255),
  slug: z
    .string()
    .min(3, 'Use pelo menos 3 caracteres.')
    .max(100, 'Use no máximo 100 caracteres.')
    .regex(SLUG_PATTERN, 'Use apenas letras minúsculas, números e hífens.')
    .refine((slug) => !isReservedSlug(slug), 'Este endereço é reservado pelo sistema. Escolha outro.'),
  email: z.email('Informe um e-mail válido.').max(320, 'Use no máximo 320 caracteres.'),
  taxId: z.string().refine(isValidTaxId, 'Informe um CPF ou CNPJ válido.'),
  phone: z
    .string()
    .refine((value) => value === '' || [10, 11].includes(onlyDigits(value).length), 'Informe um telefone com DDD.'),
  phoneIsWhatsApp: z.boolean(),
  address: addressSchema,
});

export type CreateBusinessValues = z.infer<typeof createBusinessSchema>;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isValidTimeRange = (openTime: string, closeTime: string) =>
  TIME_PATTERN.test(openTime) && TIME_PATTERN.test(closeTime) && closeTime > openTime;

export type TimeRange = {
  openTime: string;
  closeTime: string;
};

export type WeeklyHoursReference = Partial<Record<number, TimeRange | null>>;

export type WeeklyHoursMessages = {
  startRequired: string;
  endRequired: string;
  endBeforeStart: string;
  closedReference?: string;
  outsideReference?: (range: TimeRange) => string;
};

export const createWeeklyHoursSchema = (messages: WeeklyHoursMessages, reference?: WeeklyHoursReference) => {
  const daySchema = z
    .object({
      dayOfWeek: z.number().int().min(0).max(6),
      isClosed: z.boolean(),
      openTime: z.string(),
      closeTime: z.string(),
    })
    .superRefine((day, context) => {
      if (day.isClosed) return;

      const allowed = reference?.[day.dayOfWeek];
      if (reference && !allowed) {
        context.addIssue({ code: 'custom', path: ['isClosed'], message: messages.closedReference ?? '' });
        return;
      }
      if (!TIME_PATTERN.test(day.openTime)) {
        context.addIssue({ code: 'custom', path: ['openTime'], message: messages.startRequired });
      }
      if (!TIME_PATTERN.test(day.closeTime)) {
        context.addIssue({ code: 'custom', path: ['closeTime'], message: messages.endRequired });
        return;
      }
      if (TIME_PATTERN.test(day.openTime) && day.closeTime <= day.openTime) {
        context.addIssue({ code: 'custom', path: ['closeTime'], message: messages.endBeforeStart });
        return;
      }
      if (allowed && messages.outsideReference) {
        if (day.openTime < allowed.openTime) {
          context.addIssue({ code: 'custom', path: ['openTime'], message: messages.outsideReference(allowed) });
        }
        if (day.closeTime > allowed.closeTime) {
          context.addIssue({ code: 'custom', path: ['closeTime'], message: messages.outsideReference(allowed) });
        }
      }
    });

  return z.object({
    hours: z.array(daySchema).length(7),
  });
};

export type WeeklyHoursValues = z.infer<ReturnType<typeof createWeeklyHoursSchema>>;

export const businessHoursSchema = createWeeklyHoursSchema({
  startRequired: 'Informe a abertura.',
  endRequired: 'Informe o fechamento.',
  endBeforeStart: 'O fechamento deve ser depois da abertura.',
});

export type BusinessHoursValues = WeeklyHoursValues;

const MINUTES_PER_DAY = 24 * 60;

const wholeNumber = (min: number, max: number) =>
  z
    .number('Informe um número.')
    .int('Use um número inteiro.')
    .min(min, `Use no mínimo ${min}.`)
    .max(max, `Use no máximo ${max}.`);

const multipleOfFive = (min: number, max: number) =>
  wholeNumber(min, max).multipleOf(5, 'Use um múltiplo de 5.');

export const bookingSettingsSchema = z
  .object({
    slotIntervalMinutes: multipleOfFive(5, 240),
    bufferMinutes: multipleOfFive(0, 120),
    minimumAdvanceBookingMinutes: wholeNumber(0, 43200),
    maximumAdvanceBookingDays: wholeNumber(1, 365),
    cancellationLimitHours: wholeNumber(0, 720),
    autoConfirmOnlineBookings: z.boolean(),
    reminderHoursBefore: wholeNumber(0, 168),
    unblockFee: z
      .number('Informe um valor.')
      .min(0, 'O valor não pode ser negativo.')
      .max(10000, 'Use no máximo R$ 10.000,00.')
      .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, 'Use no máximo 2 casas decimais.'),
  })
  .refine(
    (settings) => settings.minimumAdvanceBookingMinutes < settings.maximumAdvanceBookingDays * MINUTES_PER_DAY,
    { path: ['minimumAdvanceBookingMinutes'], message: 'A antecedência mínima deve ser menor que a máxima.' },
  );

export type BookingSettingsValues = z.infer<typeof bookingSettingsSchema>;

export const paymentMethodSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').max(100, 'Use no máximo 100 caracteres.'),
  description: z.string().trim().max(255, 'Use no máximo 255 caracteres.'),
  isActive: z.boolean(),
});

export type PaymentMethodValues = z.infer<typeof paymentMethodSchema>;

export const businessDetailsSchema = createBusinessSchema
  .pick({ name: true, slug: true, email: true, phone: true, phoneIsWhatsApp: true, address: true })
  .extend({
    description: z.string().trim().max(1000, 'Use no máximo 1000 caracteres.'),
    timezone: z.string().min(1, 'Escolha o fuso horário.'),
  });

export type BusinessDetailsValues = z.infer<typeof businessDetailsSchema>;

const socialField = (network: SocialNetwork) => {
  const { label, domains } = SOCIAL_NETWORK_CONFIG[network];
  const message = domains
    ? `Informe o @usuário ou um link do ${label}.`
    : 'Informe um endereço válido, como https://seunegocio.com.br.';

  return z
    .string()
    .trim()
    .max(2048, 'Use no máximo 2048 caracteres.')
    .refine((value) => {
      if (!value) return true;
      const url = toSocialUrl(network, value);
      return url !== null && isSocialUrlValid(network, url);
    }, message);
};

export const socialLinksSchema = z.object({
  [SocialNetwork.INSTAGRAM]: socialField(SocialNetwork.INSTAGRAM),
  [SocialNetwork.FACEBOOK]: socialField(SocialNetwork.FACEBOOK),
  [SocialNetwork.TIKTOK]: socialField(SocialNetwork.TIKTOK),
  [SocialNetwork.YOUTUBE]: socialField(SocialNetwork.YOUTUBE),
  [SocialNetwork.X]: socialField(SocialNetwork.X),
  [SocialNetwork.LINKEDIN]: socialField(SocialNetwork.LINKEDIN),
  [SocialNetwork.WEBSITE]: socialField(SocialNetwork.WEBSITE),
});

export type SocialLinksValues = z.infer<typeof socialLinksSchema>;
