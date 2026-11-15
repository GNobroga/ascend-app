import { TZDate } from '@date-fns/tz';
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isValid,
  min,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';
import type { DashboardFilters } from './api/dashboard.api';

export const PERIOD_PRESETS = ['today', '7d', '30d', '90d', 'this-month', 'last-month', 'custom'] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const DEFAULT_PERIOD: PeriodPreset = '30d';

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: 'Hoje',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  'this-month': 'Este mês',
  'last-month': 'Mês passado',
  custom: 'Personalizado',
};

const MAX_PERIOD_DAYS = 366;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toKey = (date: Date) => format(date, 'yyyy-MM-dd');

const parseKey = (key: string | null) => {
  if (!key || !DATE_KEY_PATTERN.test(key)) return null;
  const date = parseISO(key);
  return isValid(date) ? date : null;
};

export const businessToday = (timeZone: string) => toKey(TZDate.tz(timeZone));

const lastDays = (today: Date, days: number) => ({ from: toKey(addDays(today, 1 - days)), to: toKey(today) });

const monthToDate = (today: Date) => {
  const start = startOfMonth(today);
  const previousStart = subMonths(start, 1);
  return {
    from: toKey(start),
    to: toKey(today),
    compareFrom: toKey(previousStart),
    compareTo: toKey(min([addDays(previousStart, differenceInCalendarDays(today, start)), endOfMonth(previousStart)])),
  };
};

const lastMonth = (today: Date) => {
  const start = subMonths(startOfMonth(today), 1);
  const previousStart = subMonths(start, 1);
  return {
    from: toKey(start),
    to: toKey(endOfMonth(start)),
    compareFrom: toKey(previousStart),
    compareTo: toKey(endOfMonth(previousStart)),
  };
};

export const isValidCustomRange = (from: string | null, to: string | null) => {
  const start = parseKey(from);
  const end = parseKey(to);
  if (!start || !end) return false;
  const days = differenceInCalendarDays(end, start);
  return days >= 0 && days < MAX_PERIOD_DAYS;
};

type PeriodSelection = {
  period: PeriodPreset;
  from: string | null;
  to: string | null;
  professionalId: string | null;
};

export const resolveFilters = ({ period, from, to, professionalId }: PeriodSelection, todayKey: string): DashboardFilters => {
  const today = parseISO(todayKey);
  const range = (() => {
    switch (period) {
      case 'today':
        return lastDays(today, 1);
      case '7d':
        return lastDays(today, 7);
      case '90d':
        return lastDays(today, 90);
      case 'this-month':
        return monthToDate(today);
      case 'last-month':
        return lastMonth(today);
      case 'custom':
        return from && to && isValidCustomRange(from, to) ? { from, to } : lastDays(today, 30);
      default:
        return lastDays(today, 30);
    }
  })();
  return { compareFrom: null, compareTo: null, ...range, professionalId };
};
