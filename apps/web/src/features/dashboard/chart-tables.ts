import { formatCurrency } from '@/shared/lib/format-currency';
import type { ChartTableData } from './components/chart-card';
import type { RankingItem } from './components/ranking-chart';
import { formatBucketHeading, formatHour, formatInteger, WEEKDAY_NAMES, WEEKDAYS } from './format';
import type { DashboardBucket, DashboardHeatmapCell, DashboardInterval } from './types';

export const rankingTable = (items: RankingItem[], nameColumn: string): ChartTableData => ({
  columns: [nameColumn, ...(items[0]?.details.map(({ label }) => label) ?? [])],
  rows: items.map((item) => ({ key: item.key, cells: [item.label, ...item.details.map(({ value }) => value)] })),
});

export const revenueTable = (buckets: DashboardBucket[], interval: DashboardInterval): ChartTableData => ({
  columns: ['Período', 'Faturamento', 'Recebido', 'Atendimentos'],
  rows: buckets.map((bucket) => ({
    key: bucket.start,
    cells: [
      formatBucketHeading(bucket.start, interval),
      formatCurrency(bucket.revenue),
      formatCurrency(bucket.received),
      formatInteger(bucket.completed),
    ],
  })),
});

export const statusTable = (buckets: DashboardBucket[], interval: DashboardInterval): ChartTableData => ({
  columns: ['Período', 'Concluídos', 'Faltas', 'Cancelados', 'Em aberto', 'Total'],
  rows: buckets.map((bucket) => ({
    key: bucket.start,
    cells: [
      formatBucketHeading(bucket.start, interval),
      formatInteger(bucket.completed),
      formatInteger(bucket.noShows),
      formatInteger(bucket.cancelled),
      formatInteger(bucket.appointments - bucket.completed - bucket.noShows - bucket.cancelled),
      formatInteger(bucket.appointments),
    ],
  })),
});

const WEEKDAY_ORDER = new Map(WEEKDAYS.map(({ value }, index) => [value, index]));

export const heatmapTable = (cells: DashboardHeatmapCell[]): ChartTableData => ({
  columns: ['Dia', 'Hora', 'Atendimentos'],
  rows: cells
    .toSorted((a, b) => (WEEKDAY_ORDER.get(a.weekday) ?? 0) - (WEEKDAY_ORDER.get(b.weekday) ?? 0) || a.hour - b.hour)
    .map((cell) => ({
      key: `${cell.weekday}:${cell.hour}`,
      cells: [WEEKDAY_NAMES[cell.weekday] ?? '', formatHour(cell.hour), formatInteger(cell.appointments)],
    })),
});
