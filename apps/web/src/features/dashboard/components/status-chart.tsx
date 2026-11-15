import { ChartContainer, type ChartConfig } from '@packages/ui/components/chart';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import { formatBucketAxis, formatBucketHeading, formatInteger } from '../format';
import type { DashboardBucket, DashboardInterval } from '../types';
import { ChartLegend, ChartTooltipCard } from './chart-card';

const CONFIG = {
  completed: { label: 'Concluídos', color: 'var(--chart-1)' },
  noShows: { label: 'Faltas', color: 'var(--chart-2)' },
  cancelled: { label: 'Cancelados', color: 'var(--chart-3)' },
  open: { label: 'Em aberto', color: 'var(--chart-4)' },
} satisfies ChartConfig;

const SERIES = ['completed', 'noShows', 'cancelled', 'open'] as const;

type StatusSeries = (typeof SERIES)[number];

type StatusRow = DashboardBucket & { open: number };

type StatusChartProps = {
  buckets: DashboardBucket[];
  interval: DashboardInterval;
};

export function StatusChart({ buckets, interval }: StatusChartProps) {
  const rows: StatusRow[] = buckets.map((bucket) => ({
    ...bucket,
    open: bucket.appointments - bucket.completed - bucket.noShows - bucket.cancelled,
  }));
  const visible = SERIES.filter((key) => key !== 'open' || rows.some(({ open }) => open > 0));

  return (
    <>
      <ChartLegend items={visible.map((key) => ({ label: CONFIG[key].label, color: CONFIG[key].color, mark: 'rect' }))} />
      <ChartContainer config={CONFIG} className="aspect-auto h-64 w-full">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} maxBarSize={24} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="start"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(start: string) => formatBucketAxis(start, interval)}
          />
          <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
          <Tooltip
            cursor={{ fillOpacity: 0.5 }}
            content={<StatusTooltip interval={interval} visible={visible} />}
          />
          {visible.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="status"
              fill={`var(--color-${key})`}
              stroke="var(--card)"
              strokeWidth={2}
              radius={index === visible.length - 1 ? [4, 4, 0, 0] : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </>
  );
}

type StatusTooltipProps = Partial<TooltipContentProps> & {
  interval: DashboardInterval;
  visible: StatusSeries[];
};

function StatusTooltip({ active, payload, interval, visible }: StatusTooltipProps) {
  const row = payload?.[0]?.payload as StatusRow | undefined;
  if (!active || !row) return null;

  return (
    <ChartTooltipCard
      heading={formatBucketHeading(row.start, interval)}
      rows={[
        ...visible.map((key) => ({ label: CONFIG[key].label, value: formatInteger(row[key]), color: CONFIG[key].color })),
        { label: 'Total', value: formatInteger(row.appointments) },
      ]}
    />
  );
}
