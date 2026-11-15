import { Alert, AlertAction, AlertDescription } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@packages/ui/components/empty';
import { cn } from '@packages/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ChartNoAxesColumnIcon, CircleAlertIcon, RotateCwIcon } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { appointmentsPath } from '@/features/appointments';
import type { Professional } from '@/features/professionals';
import { storefrontPath } from '@/features/storefront';
import { dashboardQueries } from '../api/dashboard.queries';
import { revenueTable, statusTable } from '../chart-tables';
import { formatPeriod } from '../format';
import { useDashboardFilters } from '../hooks/use-dashboard-filters';
import { MANAGER_METRICS, PROFESSIONAL_METRICS } from '../metrics';
import { PaymentMethodsCard, ProfessionalsRankingCard, TopServicesCard } from './breakdown-cards';
import { ChartCard } from './chart-card';
import { CustomersOverviewCard, InactiveCustomersCard } from './customer-cards';
import { DashboardFilters } from './dashboard-filters';
import { MetricCards } from './metric-cards';
import { OccupancyCard } from './occupancy-card';
import { PeakHoursCard } from './peak-hours-heatmap';
import { RevenueChart } from './revenue-chart';
import { StatusChart } from './status-chart';

type PerformanceFiltersProps = {
  timeZone: string;
  canManage: boolean;
  professionals: Professional[];
};

export function PerformanceFilters({ timeZone, canManage, professionals }: PerformanceFiltersProps) {
  const { params, setParams, todayKey, filters } = useDashboardFilters(timeZone, canManage);

  return (
    <DashboardFilters
      period={params.period}
      resolved={filters}
      todayKey={todayKey}
      professionals={canManage ? professionals : null}
      onPeriodChange={(period, range) => void setParams({ period, from: range?.from ?? null, to: range?.to ?? null })}
      onCustomRangeChange={(range) => void setParams({ period: 'custom', ...range })}
      onProfessionalChange={(professional) => void setParams({ professional })}
    />
  );
}

type BusinessPerformanceProps = {
  businessId: string;
  businessSlug: string;
  timeZone: string;
  canManage: boolean;
  professionals: Professional[];
  showHeader?: boolean;
  aside?: ReactNode;
};

export function BusinessPerformance({
  businessId,
  businessSlug,
  timeZone,
  canManage,
  professionals,
  showHeader = true,
  aside,
}: BusinessPerformanceProps) {
  const { filters } = useDashboardFilters(timeZone, canManage);
  const summary = useQuery(dashboardQueries.summary(businessId, filters));
  const timeseries = useQuery(dashboardQueries.timeseries(businessId, filters));

  const buckets = timeseries.data?.buckets ?? [];
  const interval = timeseries.data?.interval ?? 'day';
  const isOwnScope = !canManage || filters.professionalId !== null;
  const isTeamScope = canManage && filters.professionalId === null;
  const chartState = (hasData: boolean) => {
    if (timeseries.isError) return 'error';
    if (timeseries.isPending) return 'loading';
    return hasData ? 'ready' : 'empty';
  };
  const withAside = (content: ReactNode) => (
    <div className={cn('grid gap-6', aside && 'xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]')}>
      {content}
      {aside}
    </div>
  );

  return (
    <section
      className="flex flex-col gap-6"
      aria-labelledby={showHeader ? 'business-performance-title' : undefined}
      aria-label={showHeader ? undefined : 'Desempenho'}
    >
      {showHeader && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="business-performance-title" className="text-lg font-semibold tracking-tight">
              Desempenho
            </h2>
            <p className="text-sm text-muted-foreground">
              {formatPeriod(filters)}
              {summary.data && ` · comparado a ${formatPeriod(summary.data.comparison)}`}
            </p>
          </div>
          <PerformanceFilters timeZone={timeZone} canManage={canManage} professionals={professionals} />
        </div>
      )}

      {summary.data && !summary.data.hasCompletedAppointments ? (
        withAside(
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartNoAxesColumnIcon />
              </EmptyMedia>
              <EmptyTitle>Os indicadores aparecem depois do primeiro atendimento</EmptyTitle>
              <EmptyDescription>
                {isOwnScope
                  ? 'Assim que um atendimento for concluído, você acompanha aqui faturamento, faltas e avaliações.'
                  : 'Agende os primeiros clientes ou divulgue a página pública para receber agendamentos online.'}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="flex-row justify-center">
              <Button nativeButton={false} render={<Link to={appointmentsPath(businessId)} />}>
                Abrir agenda
              </Button>
              {!isOwnScope && (
                <Button variant="outline" nativeButton={false} render={<Link to={storefrontPath(businessSlug)} />}>
                  Ver página pública
                </Button>
              )}
            </EmptyContent>
          </Empty>,
        )
      ) : (
        <>
          {summary.isError ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>Não foi possível carregar os indicadores.</AlertDescription>
              <AlertAction>
                <Button type="button" variant="outline" size="sm" onClick={() => void summary.refetch()}>
                  <RotateCwIcon />
                  Tentar de novo
                </Button>
              </AlertAction>
            </Alert>
          ) : (
            <div className={summary.isPlaceholderData ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
              <MetricCards
                definitions={isTeamScope ? MANAGER_METRICS : PROFESSIONAL_METRICS}
                summary={summary.data}
                buckets={buckets}
              />
            </div>
          )}

          {withAside(
            <ChartCard
              title="Faturamento"
              description="Valor dos atendimentos concluídos e o que entrou de pagamento."
              state={chartState(buckets.some(({ revenue, received }) => revenue > 0 || received > 0))}
              isRefreshing={timeseries.isPlaceholderData}
              onRetry={() => void timeseries.refetch()}
              table={revenueTable(buckets, interval)}
            >
              <RevenueChart buckets={buckets} interval={interval} />
            </ChartCard>,
          )}

          <PerformanceSection title="Agenda">
            <div className="grid gap-6 xl:grid-cols-2">
              <ChartCard
                title="Agendamentos por status"
                description="Agendamentos pelo dia de início."
                state={chartState(buckets.some(({ appointments }) => appointments > 0))}
                isRefreshing={timeseries.isPlaceholderData}
                emptyText="Sem agendamentos neste período."
                onRetry={() => void timeseries.refetch()}
                table={statusTable(buckets, interval)}
              >
                <StatusChart buckets={buckets} interval={interval} />
              </ChartCard>
              <OccupancyCard businessId={businessId} filters={filters} showProfessionals={isTeamScope} />
            </div>
            <PeakHoursCard businessId={businessId} filters={filters} />
          </PerformanceSection>

          {canManage && (
            <>
              <PerformanceSection title={isTeamScope ? 'Equipe e serviços' : 'Serviços'}>
                <div className={cn('grid gap-6', isTeamScope && 'xl:grid-cols-2')}>
                  {isTeamScope && <ProfessionalsRankingCard businessId={businessId} filters={filters} />}
                  <TopServicesCard businessId={businessId} filters={filters} />
                </div>
              </PerformanceSection>

              <PerformanceSection title="Clientes e pagamentos">
                <div className="grid gap-6 xl:grid-cols-2">
                  <CustomersOverviewCard summary={summary.data} isRefreshing={summary.isPlaceholderData} />
                  <PaymentMethodsCard businessId={businessId} filters={filters} />
                </div>
                <InactiveCustomersCard businessId={businessId} professionalId={filters.professionalId} />
              </PerformanceSection>
            </>
          )}
        </>
      )}
    </section>
  );
}

type PerformanceSectionProps = {
  title: string;
  children: ReactNode;
};

function PerformanceSection({ title, children }: PerformanceSectionProps) {
  const titleId = useId();

  return (
    <section className="flex flex-col gap-4" aria-labelledby={titleId}>
      <h3 id={titleId} className="text-base font-semibold tracking-tight">
        {title}
      </h3>
      {children}
    </section>
  );
}
