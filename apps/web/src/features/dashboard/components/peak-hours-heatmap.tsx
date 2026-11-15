import { Tooltip, TooltipContent, TooltipTrigger } from '@packages/ui/components/tooltip';
import { useQuery } from '@tanstack/react-query';
import type { DashboardFilters } from '../api/dashboard.api';
import { dashboardQueries } from '../api/dashboard.queries';
import { heatmapTable } from '../chart-tables';
import { formatHour, formatInteger, WEEKDAY_NAMES, WEEKDAYS } from '../format';
import type { DashboardHeatmapCell } from '../types';
import { ChartCard } from './chart-card';


const STEPS = [18, 36, 54, 72, 90];
const DEFAULT_HOURS = { first: 8, last: 19 };
const TOP_SLOTS = 5;

const shadeOf = (appointments: number, max: number) => {
  if (appointments === 0 || max === 0) return 'var(--muted)';
  const step = STEPS[Math.min(STEPS.length - 1, Math.floor((appointments / max) * STEPS.length - 1e-9))] ?? STEPS[0];
  return `color-mix(in oklab, var(--chart-1) ${step}%, var(--card))`;
};

type PeakHoursHeatmapProps = {
  cells: DashboardHeatmapCell[];
};

export function PeakHoursHeatmap({ cells }: PeakHoursHeatmapProps) {
  const byKey = new Map(cells.map((cell) => [`${cell.weekday}:${cell.hour}`, cell.appointments]));
  const max = Math.max(0, ...cells.map(({ appointments }) => appointments));
  const first = Math.min(DEFAULT_HOURS.first, ...cells.map(({ hour }) => hour));
  const last = Math.max(DEFAULT_HOURS.last, ...cells.map(({ hour }) => hour));
  const hours = Array.from({ length: last - first + 1 }, (_, index) => first + index);
  const peaks = cells.toSorted((a, b) => b.appointments - a.appointments).slice(0, TOP_SLOTS);

  return (
    <>
      <div className="hidden flex-col gap-3 sm:flex">
        <div
          className="grid gap-0.5 text-xs text-muted-foreground"
          style={{ gridTemplateColumns: `2.5rem repeat(${hours.length}, minmax(0, 1fr))` }}
        >
          <span />
          {hours.map((hour) => (
            <span key={hour} className="text-center tabular-nums">
              {hour % 2 === 0 ? formatHour(hour) : ''}
            </span>
          ))}
          {WEEKDAYS.map((weekday) => (
            <HeatmapRow key={weekday.value} weekday={weekday} hours={hours} byKey={byKey} max={max} />
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Menos
          <span className="flex gap-0.5" aria-hidden>
            {STEPS.map((step) => (
              <span
                key={step}
                className="size-3 rounded-[3px]"
                style={{ backgroundColor: `color-mix(in oklab, var(--chart-1) ${step}%, var(--card))` }}
              />
            ))}
          </span>
          Mais atendimentos
        </div>
      </div>

      <ol className="flex flex-col divide-y sm:hidden">
        {peaks.map((cell) => (
          <li key={`${cell.weekday}:${cell.hour}`} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>
              {WEEKDAY_NAMES[cell.weekday]}, {formatHour(cell.hour)}
            </span>
            <span className="font-medium tabular-nums">{formatInteger(cell.appointments)} atendimentos</span>
          </li>
        ))}
      </ol>
    </>
  );
}

type HeatmapRowProps = {
  weekday: (typeof WEEKDAYS)[number];
  hours: number[];
  byKey: Map<string, number>;
  max: number;
};

function HeatmapRow({ weekday, hours, byKey, max }: HeatmapRowProps) {
  return (
    <>
      <span className="flex items-center">{weekday.short}</span>
      {hours.map((hour) => {
        const appointments = byKey.get(`${weekday.value}:${hour}`) ?? 0;
        return (
          <Tooltip key={hour}>
            <TooltipTrigger
              render={
                <span
                  className="aspect-square min-h-4 rounded-[3px] transition-[filter] hover:brightness-90"
                  style={{ backgroundColor: shadeOf(appointments, max) }}
                />
              }
            />
            <TooltipContent>
              {weekday.long}, {formatHour(hour)}: {formatInteger(appointments)} atendimentos
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}

type PeakHoursCardProps = {
  businessId: string;
  filters: DashboardFilters;
};

export function PeakHoursCard({ businessId, filters }: PeakHoursCardProps) {
  const query = useQuery(dashboardQueries.heatmap(businessId, filters));
  const cells = query.data?.cells ?? [];
  const state = (() => {
    if (query.isError) return 'error';
    if (query.isPending) return 'loading';
    return cells.length > 0 ? 'ready' : 'empty';
  })();

  return (
    <ChartCard
      title="Horários de pico"
      description="Atendimentos por dia da semana e hora de início."
      state={state}
      isRefreshing={query.isPlaceholderData}
      onRetry={() => void query.refetch()}
      table={heatmapTable(cells)}
    >
      <PeakHoursHeatmap cells={cells} />
    </ChartCard>
  );
}
