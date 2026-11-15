import { formatCurrency } from '@/shared/lib/format-currency';
import { formatInteger, formatRate, formatRating } from './format';
import type { DashboardBucket, DashboardMetrics } from './types';

export type DeltaKind = 'relative' | 'points' | 'absolute';

export type MetricDefinition = {
  key: string;
  label: string;
  value: (metrics: DashboardMetrics) => number | null;
  format: (value: number) => string;
  formatDelta: (delta: number) => string;
  delta: DeltaKind;
  higherIsBetter: boolean;
  trend: (bucket: DashboardBucket) => number | null;
};

const signed = (text: string, delta: number) => {
  if (delta > 0) return `+${text}`;
  if (delta < 0) return `−${text}`;
  return text;
};

const relative = (delta: number) => signed(formatRate(Math.abs(delta)), delta);

const share = (part: number, whole: number) => (whole > 0 ? part / whole : null);

const REVENUE: MetricDefinition = {
  key: 'revenue',
  label: 'Faturamento',
  value: (m) => m.revenue,
  format: formatCurrency,
  formatDelta: relative,
  delta: 'relative',
  higherIsBetter: true,
  trend: (b) => b.revenue,
};

const COMPLETED: MetricDefinition = {
  key: 'completed',
  label: 'Atendimentos',
  value: (m) => m.completed,
  format: formatInteger,
  formatDelta: relative,
  delta: 'relative',
  higherIsBetter: true,
  trend: (b) => b.completed,
};

const AVERAGE_TICKET: MetricDefinition = {
  key: 'averageTicket',
  label: 'Ticket médio',
  value: (m) => m.averageTicket,
  format: formatCurrency,
  formatDelta: relative,
  delta: 'relative',
  higherIsBetter: true,
  trend: (b) => share(b.revenue, b.completed),
};

const NO_SHOW_RATE: MetricDefinition = {
  key: 'noShowRate',
  label: 'Taxa de faltas',
  value: (m) => m.noShowRate,
  format: formatRate,
  formatDelta: (delta) => signed(`${formatRating(Math.abs(delta * 100))} p.p.`, delta),
  delta: 'points',
  higherIsBetter: false,
  trend: (b) => share(b.noShows, b.completed + b.noShows),
};

const NEW_CUSTOMERS: MetricDefinition = {
  key: 'newCustomers',
  label: 'Clientes novos',
  value: (m) => m.newCustomers,
  format: formatInteger,
  formatDelta: relative,
  delta: 'relative',
  higherIsBetter: true,
  trend: (b) => b.newCustomers,
};

const AVERAGE_RATING: MetricDefinition = {
  key: 'averageRating',
  label: 'Nota média',
  value: (m) => m.averageRating,
  format: formatRating,
  formatDelta: (delta) => signed(formatRating(Math.abs(delta)), delta),
  delta: 'absolute',
  higherIsBetter: true,
  trend: (b) => b.averageRating,
};

const COMMISSION: MetricDefinition = {
  key: 'commission',
  label: 'Comissão',
  value: (m) => m.commission,
  format: formatCurrency,
  formatDelta: relative,
  delta: 'relative',
  higherIsBetter: true,
  trend: (b) => b.commission,
};

export const MANAGER_METRICS = [REVENUE, COMPLETED, AVERAGE_TICKET, NO_SHOW_RATE, NEW_CUSTOMERS, AVERAGE_RATING];

export const PROFESSIONAL_METRICS = [COMPLETED, REVENUE, COMMISSION, AVERAGE_RATING];

export const deltaOf = (definition: MetricDefinition, current: number | null, previous: number | null) => {
  if (current === null || previous === null) return null;
  if (definition.delta === 'relative') return previous === 0 ? null : (current - previous) / previous;
  return current - previous;
};
