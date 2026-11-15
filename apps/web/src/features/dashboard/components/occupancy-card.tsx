import { cn } from '@packages/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from 'lucide-react';
import type { DashboardFilters } from '../api/dashboard.api';
import { dashboardQueries } from '../api/dashboard.queries';
import { rankingTable } from '../chart-tables';
import { formatRate, formatRating } from '../format';
import type { DashboardOccupancyReport } from '../types';
import { ChartCard } from './chart-card';
import { RankingChart, type RankingItem } from './ranking-chart';

const DELTA_ICONS: Record<number, typeof MinusIcon> = { 1: ArrowUpRightIcon, [-1]: ArrowDownRightIcon };

const formatHours = (minutes: number) => `${formatRating(minutes / 60)} h`;

type OccupancyCardProps = {
  businessId: string;
  filters: DashboardFilters;
  showProfessionals: boolean;
};

export function OccupancyCard({ businessId, filters, showProfessionals }: OccupancyCardProps) {
  const query = useQuery(dashboardQueries.occupancy(businessId, filters));
  const report = query.data;
  const items = (report?.professionals ?? []).map(
    (professional): RankingItem => ({
      key: professional.professionalId,
      label: professional.name,
      value: professional.rate ?? 0,
      details: [
        { label: 'Ocupação', value: professional.rate === null ? '–' : formatRate(professional.rate) },
        { label: 'Agendado', value: formatHours(professional.bookedMinutes) },
        { label: 'Expediente', value: formatHours(professional.availableMinutes) },
      ],
    }),
  );
  const state = (() => {
    if (query.isError) return 'error';
    if (query.isPending) return 'loading';
    return report?.current.availableMinutes ? 'ready' : 'empty';
  })();

  return (
    <ChartCard
      title="Ocupação da agenda"
      description="Tempo agendado sobre o expediente, descontadas as ausências."
      state={state}
      isRefreshing={query.isPlaceholderData}
      emptyText="Nenhum expediente cadastrado neste período."
      onRetry={() => void query.refetch()}
      table={rankingTable(items, 'Profissional')}
    >
      {report && (
        <div className="flex flex-col gap-5">
          <OccupancyFigure report={report} />
          {showProfessionals && items.length > 1 && <RankingChart items={items} formatValue={formatRate} />}
        </div>
      )}
    </ChartCard>
  );
}

function OccupancyFigure({ report }: { report: DashboardOccupancyReport }) {
  const { current, previous } = report;
  const points = current.rate !== null && previous.rate !== null ? Math.round((current.rate - previous.rate) * 1000) / 10 : null;
  const Icon = DELTA_ICONS[Math.sign(points ?? 0)] ?? MinusIcon;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-3xl font-semibold tracking-tight">{current.rate === null ? '–' : formatRate(current.rate)}</p>
      <p className="text-sm text-muted-foreground">
        {formatHours(current.bookedMinutes)} agendadas de {formatHours(current.availableMinutes)} de expediente
      </p>
      {points !== null && (
        <p className="flex items-center gap-1 text-xs">
          <span
            className={cn(
              'flex items-center gap-0.5 font-medium',
              points > 0 && 'text-chart-positive',
              points < 0 && 'text-chart-negative',
              points === 0 && 'text-muted-foreground',
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {points > 0 ? '+' : ''}
            {points.toLocaleString('pt-BR')} p.p.
          </span>
          <span className="text-muted-foreground">vs. período anterior</span>
        </p>
      )}
    </div>
  );
}
