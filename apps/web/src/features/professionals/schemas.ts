import { z } from 'zod';
import { createWeeklyHoursSchema, type WeeklyHoursReference } from '@/features/businesses';
import { ProfessionalTimeOffType } from './types';

const hasAtMostTwoDecimals = (value: number) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

const commissionPercent = z
  .number('Informe a comissão.')
  .min(0, 'A comissão não pode ser negativa.')
  .max(100, 'Use no máximo 100%.')
  .refine(hasAtMostTwoDecimals, 'Use no máximo 2 casas decimais.');

const displayName = z
  .string()
  .trim()
  .min(1, 'Informe o nome de exibição.')
  .max(255, 'Use no máximo 255 caracteres.');

export const createProfessionalSchema = z.object({
  memberId: z.string().min(1, 'Escolha quem vai atender.'),
  displayName,
  commissionPercent,
});

export type CreateProfessionalValues = z.infer<typeof createProfessionalSchema>;

export const professionalProfileSchema = z.object({
  displayName,
  bio: z.string().trim().max(2000, 'Use no máximo 2000 caracteres.'),
  commissionPercent,
  specialtyIds: z.array(z.string()),
});

export type ProfessionalProfileValues = z.infer<typeof professionalProfileSchema>;

const assignmentSchema = z.object({
  id: z.string(),
  selected: z.boolean(),
  commissionPercent: z.number().refine((value) => Number.isNaN(value) || commissionPercent.safeParse(value).success, {
    message: 'Use de 0 a 100%, com até 2 casas decimais.',
  }),
});

export const assignmentsSchema = z.object({
  services: z.array(assignmentSchema),
  packages: z.array(assignmentSchema),
});

export type AssignmentsValues = z.infer<typeof assignmentsSchema>;

export const createWorkingHoursSchema = (reference?: WeeklyHoursReference) =>
  createWeeklyHoursSchema(
    {
      startRequired: 'Informe o início.',
      endRequired: 'Informe o fim.',
      endBeforeStart: 'O fim deve ser depois do início.',
      closedReference: 'O negócio fica fechado neste dia.',
      outsideReference: ({ openTime, closeTime }) => `O negócio abre das ${openTime} às ${closeTime}.`,
    },
    reference,
  );

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const END_BEFORE_START = 'O fim deve ser depois do início.';

export const timeOffSchema = z
  .object({
    type: z.enum(ProfessionalTimeOffType),
    allDay: z.boolean(),
    startDate: z.string().regex(DATE_PATTERN, 'Informe a data de início.'),
    endDate: z.string().regex(DATE_PATTERN, 'Informe a data de fim.'),
    startTime: z.string(),
    endTime: z.string(),
    reason: z.string().trim().max(500, 'Use no máximo 500 caracteres.'),
  })
  .superRefine((values, context) => {
    if (!values.allDay) {
      if (!TIME_PATTERN.test(values.startTime)) {
        context.addIssue({ code: 'custom', path: ['startTime'], message: 'Informe o horário de início.' });
      }
      if (!TIME_PATTERN.test(values.endTime)) {
        context.addIssue({ code: 'custom', path: ['endTime'], message: 'Informe o horário de fim.' });
      }
    }
    if (!DATE_PATTERN.test(values.startDate) || !DATE_PATTERN.test(values.endDate)) return;

    if (values.endDate < values.startDate) {
      context.addIssue({ code: 'custom', path: ['endDate'], message: END_BEFORE_START });
      return;
    }
    if (!values.allDay && values.endDate === values.startDate && values.endTime <= values.startTime) {
      context.addIssue({ code: 'custom', path: ['endTime'], message: END_BEFORE_START });
    }
  });

export type TimeOffValues = z.infer<typeof timeOffSchema>;

export const specialtySchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').max(100, 'Use no máximo 100 caracteres.'),
  description: z.string().trim().max(255, 'Use no máximo 255 caracteres.'),
});

export type SpecialtyValues = z.infer<typeof specialtySchema>;
