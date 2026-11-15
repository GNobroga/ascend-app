import { ChartContainer, type ChartConfig } from '@packages/ui/components/chart';
import { cn } from '@packages/ui/lib/utils';
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from 'lucide-react';
import { Line, LineChart, YAxis } from 'recharts';
import { formatPeriod } from '../format';
import { deltaOf, type MetricDefinition } from '../metrics';
import type { DashboardBucket, DashboardSummary } from '../types';

const DELTA_ICONS: Record<number, typeof MinusIcon> = { 1: ArrowUpRightIcon, [-1]: ArrowDownRightIcon };

const TREND_CONFIG = { value: { label: 'Tendência', color: 'var(--muted-foreground)' } } satisfies ChartConfig;

type MetricCardsProps = {
  definitions: MetricDefinition[];
  summary: DashboardSummary | undefined;
  buckets: DashboardBucket[];
};

export function MetricCards({ definitions, summary, buckets }: MetricCardsProps) {
  return (
    <dl className={cn('grid grid-cols-2 gap-3', definitions.length > 4 ? 'lg:grid-cols-3 2xl:grid-cols-6' : 'lg:grid-cols-4')}>
      {definitions.map((definition) => (
        <MetricCard key={definition.key} definition={definition} summary={summary} buckets={buckets} />
      ))}
    </dl>
  );
}

type MetricCardProps = {
  definition: MetricDefinition;
  summary: DashboardSummary | undefined;
  buckets: DashboardBucket[];
};

function MetricCard({ definition, summary, buckets }: MetricCardProps) {
  const current = summary ? definition.value(summary.current) : null;
  const previous = summary ? definition.value(summary.previous) : null;
  const trend = buckets.map((bucket) => ({ value: definition.trend(bucket) }));
  const hasTrend = trend.filter(({ value }) => value !== null).length > 1;

  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{definition.label}</dt>
      <dd className="truncate text-2xl font-semibold tracking-tight">
        {current === null ? '–' : definition.format(current)}
      </dd>
      <dd className="min-h-4 text-xs">
        {summary && <Delta definition={definition} current={current} previous={previous} summary={summary} />}
      </dd>
      <dd aria-hidden className="mt-1 h-8">
        {hasTrend && (
          <ChartContainer config={TREND_CONFIG} className="aspect-auto h-8 w-full" initialDimension={{ width: 160, height: 32 }}>
            <LineChart data={trend} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Line
                dataKey="value"
                type="monotone"
                stroke="var(--color-value)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </dd>
    </div>
  );
}

type DeltaProps = {
  definition: MetricDefinition;
  current: number | null;
  previous: number | null;
  summary: DashboardSummary;
};

function Delta({ definition, current, previous, summary }: DeltaProps) {
  const delta = deltaOf(definition, current, previous);
  const comparison = formatPeriod(summary.comparison);
  if (delta === null) {
    return <span className="text-muted-foreground">Sem base de comparação</span>;
  }

  const rounded = Math.round(delta * 1000) / 1000;
  const Icon = DELTA_ICONS[Math.sign(rounded)] ?? MinusIcon;
  const isGood = rounded === 0 ? null : rounded > 0 === definition.higherIsBetter;

  return (
    <span className="flex items-center gap-1" title={`Comparado a ${comparison}`}>
      <span
        className={cn(
          'flex items-center gap-0.5 font-medium',
          isGood === true && 'text-chart-positive',
          isGood === false && 'text-chart-negative',
          isGood === null && 'text-muted-foreground',
        )}
      >
        <Icon className="size-3.5" aria-hidden />
        {definition.formatDelta(rounded)}
      </span>
      <span className="truncate text-muted-foreground">vs. período anterior</span>
    </span>
  );
}
