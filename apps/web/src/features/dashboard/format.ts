import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DashboardInterval } from './types';

const integerFormatter = new Intl.NumberFormat('pt-BR');
const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const rateFormatter = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
const ratingFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatInteger = (value: number) => integerFormatter.format(value);

export const formatCompactCurrency = (value: number) => compactCurrencyFormatter.format(value);

export const formatRate = (value: number) => rateFormatter.format(value);

export const formatRating = (value: number) => ratingFormatter.format(value);

const AXIS_PATTERNS: Record<DashboardInterval, string> = {
  day: 'd MMM',
  week: 'd MMM',
  month: 'MMM yy',
};

const HEADING_PATTERNS: Record<DashboardInterval, string> = {
  day: "EEEE, d 'de' MMMM",
  week: "'Semana de' d 'de' MMMM",
  month: "MMMM 'de' yyyy",
};

export const formatBucketAxis = (start: string, interval: DashboardInterval) =>
  format(parseISO(start), AXIS_PATTERNS[interval], { locale: ptBR });

export const formatBucketHeading = (start: string, interval: DashboardInterval) =>
  format(parseISO(start), HEADING_PATTERNS[interval], { locale: ptBR });

export const formatPeriod = ({ from, to }: { from: string; to: string }) => {
  const start = parseISO(from);
  const end = parseISO(to);
  if (from === to) return format(start, "d 'de' MMM", { locale: ptBR });
  const sameYear = start.getFullYear() === end.getFullYear();
  return `${format(start, sameYear ? "d 'de' MMM" : "d 'de' MMM 'de' yyyy", { locale: ptBR })} a ${format(end, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`;
};

export const WEEKDAYS = [
  { value: 1, short: 'Seg', long: 'Segunda' },
  { value: 2, short: 'Ter', long: 'Terça' },
  { value: 3, short: 'Qua', long: 'Quarta' },
  { value: 4, short: 'Qui', long: 'Quinta' },
  { value: 5, short: 'Sex', long: 'Sexta' },
  { value: 6, short: 'Sáb', long: 'Sábado' },
  { value: 0, short: 'Dom', long: 'Domingo' },
];

export const WEEKDAY_NAMES = Object.fromEntries(WEEKDAYS.map(({ value, long }) => [value, long])) as Record<number, string>;

export const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}h`;
