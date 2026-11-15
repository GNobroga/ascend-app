import { ChartContainer, type ChartConfig } from '@packages/ui/components/chart';
import { Bar, BarChart, LabelList, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import { ChartTooltipCard, type TooltipRow } from './chart-card';

const CONFIG = { value: { label: 'Valor', color: 'var(--chart-1)' } } satisfies ChartConfig;

const ROW_HEIGHT = 36;
const LABEL_WIDTH = 132;
const MAX_LABEL_LENGTH = 18;

export type RankingItem = {
  key: string;
  label: string;
  value: number;
  details: TooltipRow[];
};

type RankingChartProps = {
  items: RankingItem[];
  formatValue: (value: number) => string;
};

const truncate = (label: string) => (label.length > MAX_LABEL_LENGTH ? `${label.slice(0, MAX_LABEL_LENGTH - 1)}…` : label);

export function RankingChart({ items, formatValue }: RankingChartProps) {
  return (
    <ChartContainer
      config={CONFIG}
      className="aspect-auto w-full"
      style={{ height: items.length * ROW_HEIGHT + 8 }}
      initialDimension={{ width: 480, height: items.length * ROW_HEIGHT + 8 }}
    >
      <BarChart data={items} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 0 }} barSize={20} accessibilityLayer>
        <XAxis type="number" dataKey="value" hide domain={[0, 'dataMax']} />
        <YAxis
          type="category"
          dataKey="label"
          width={LABEL_WIDTH}
          tickLine={false}
          axisLine={false}
          tickFormatter={truncate}
          className="text-foreground"
        />
        <Tooltip cursor={{ fillOpacity: 0.5 }} content={<RankingTooltip />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          <LabelList
            dataKey="value"
            position="right"
            offset={8}
            className="fill-foreground"
            fontSize={12}
            formatter={(value: unknown) => (typeof value === 'number' ? formatValue(value) : '')}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function RankingTooltip({ active, payload }: Partial<TooltipContentProps>) {
  const item = payload?.[0]?.payload as RankingItem | undefined;
  if (!active || !item) return null;

  return <ChartTooltipCard heading={item.label} rows={item.details} />;
}
