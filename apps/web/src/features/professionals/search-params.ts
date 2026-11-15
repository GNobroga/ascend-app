import { parseAsStringLiteral } from 'nuqs';

export const PROFESSIONAL_TABS = ['profile', 'assignments', 'hours', 'time-offs'] as const;

export type ProfessionalTab = (typeof PROFESSIONAL_TABS)[number];

export const professionalSearchParams = {
  tab: parseAsStringLiteral(PROFESSIONAL_TABS).withDefault('profile'),
};

export const isProfessionalTab = (value: unknown): value is ProfessionalTab =>
  PROFESSIONAL_TABS.some((tab) => tab === value);
