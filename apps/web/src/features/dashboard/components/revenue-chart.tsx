import { ChartContainer, type ChartConfig } from '@packages/ui/components/chart';
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import { formatCurrency } from '@/shared/lib/format-currency';
import { formatBucketAxis, formatBucketHeading, formatCompactCurrency, formatInteger } from '../format';
import type { DashboardBucket, DashboardInterval } from '../types';
import { ChartLegend, ChartTooltipCard } from './chart-card';

const CONFIG = {
  revenue: { label: 'Faturamento', color: 'var(--chart-1)' },
  received: { label: 'Recebido', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const ACTIVE_DOT = { r: 4, strokeWidth: 2, stroke: 'var(--card)' };

type RevenueChartProps = {
  buckets: DashboardBucket[];
  interval: DashboardInterval;
};

export function RevenueChart({ buckets, interval }: RevenueChartProps) {
  return (
    <>
      <ChartLegend
        items={[
          { label: CONFIG.revenue.label, color: CONFIG.revenue.color, mark: 'rect' },
          { label: CONFIG.received.label, color: CONFIG.received.color, mark: 'line' },
        ]}
      />
      <ChartContainer config={CONFIG} className="aspect-auto h-64 w-full">
        <AreaChart data={buckets} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="start"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(start: string) => formatBucketAxis(start, interval)}
          />
          <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={formatCompactCurrency} />
          <Tooltip
            cursor={{ strokeWidth: 1 }}
            content={<RevenueTooltip interval={interval} />}
          />
          <Area
            dataKey="revenue"
            type="monotone"
            stroke="var(--color-revenue)"
            strokeWidth={2}
            fill="var(--color-revenue)"
            fillOpacity={0.1}
            activeDot={ACTIVE_DOT}
            isAnimationActive={false}
          />
          <Area
            dataKey="received"
            type="monotone"
            stroke="var(--color-received)"
            strokeWidth={2}
            fill="none"
            activeDot={ACTIVE_DOT}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </>
  );
}

type RevenueTooltipProps = Partial<TooltipContentProps> & {
  interval: DashboardInterval;
};

function RevenueTooltip({ active, payload, interval }: RevenueTooltipProps) {
  const bucket = payload?.[0]?.payload as DashboardBucket | undefined;
  if (!active || !bucket) return null;

  return (
    <ChartTooltipCard
      heading={formatBucketHeading(bucket.start, interval)}
      rows={[
        { label: CONFIG.revenue.label, value: formatCurrency(bucket.revenue), color: CONFIG.revenue.color },
        { label: CONFIG.received.label, value: formatCurrency(bucket.received), color: CONFIG.received.color },
        { label: 'Atendimentos', value: formatInteger(bucket.completed) },
      ]}
    />
  );
}
