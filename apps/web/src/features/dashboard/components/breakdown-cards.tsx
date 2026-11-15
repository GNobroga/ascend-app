import { ToggleGroup, ToggleGroupItem } from '@packages/ui/components/toggle-group';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { formatCurrency } from '@/shared/lib/format-currency';
import type { DashboardFilters } from '../api/dashboard.api';
import { dashboardQueries } from '../api/dashboard.queries';
import { rankingTable } from '../chart-tables';
import { formatInteger, formatRate, formatRating } from '../format';
import type { DashboardProfessionalItem, DashboardServiceItem } from '../types';
import { ChartCard } from './chart-card';
import { RankingChart, type RankingItem } from './ranking-chart';

const MAX_PROFESSIONALS = 8;
const TOP_SERVICES = 10;

type BreakdownCardProps = {
  businessId: string;
  filters: DashboardFilters;
};

const stateOf = (query: { isError: boolean; isPending: boolean }, hasItems: boolean) => {
  if (query.isError) return 'error';
  if (query.isPending) return 'loading';
  return hasItems ? 'ready' : 'empty';
};

const professionalItem = (professional: DashboardProfessionalItem): RankingItem => ({
  key: professional.professionalId,
  label: professional.name,
  value: professional.revenue,
  details: [
    { label: 'Faturamento', value: formatCurrency(professional.revenue) },
    { label: 'Atendimentos', value: formatInteger(professional.completed) },
    { label: 'Ticket médio', value: professional.averageTicket === null ? '–' : formatCurrency(professional.averageTicket) },
    { label: 'Nota média', value: professional.averageRating === null ? '–' : formatRating(professional.averageRating) },
    { label: 'Taxa de faltas', value: professional.noShowRate === null ? '–' : formatRate(professional.noShowRate) },
  ],
});

const foldProfessionals = (professionals: DashboardProfessionalItem[]): RankingItem[] => {
  if (professionals.length <= MAX_PROFESSIONALS) return professionals.map(professionalItem);

  const top = professionals.slice(0, MAX_PROFESSIONALS - 1);
  const rest = professionals.slice(MAX_PROFESSIONALS - 1);
  const revenue = rest.reduce((sum, { revenue: value }) => sum + value, 0);
  const completed = rest.reduce((sum, { completed: value }) => sum + value, 0);
  return [
    ...top.map(professionalItem),
    {
      key: 'others',
      label: `Outros (${rest.length})`,
      value: revenue,
      details: [
        { label: 'Faturamento', value: formatCurrency(revenue) },
        { label: 'Atendimentos', value: formatInteger(completed) },
      ],
    },
  ];
};

export function ProfessionalsRankingCard({ businessId, filters }: BreakdownCardProps) {
  const query = useQuery(dashboardQueries.professionals(businessId, filters));
  const items = foldProfessionals(query.data?.items ?? []);

  return (
    <ChartCard
      title="Profissionais"
      description="Faturamento dos atendimentos de cada profissional."
      state={stateOf(query, items.length > 0)}
      isRefreshing={query.isPlaceholderData}
      onRetry={() => void query.refetch()}
      table={rankingTable(items, 'Profissional')}
    >
      <RankingChart items={items} formatValue={formatCurrency} />
    </ChartCard>
  );
}

const SERVICE_SORTS = ['revenue', 'quantity'] as const;

type ServiceSort = (typeof SERVICE_SORTS)[number];

const isServiceSort = (value: unknown): value is ServiceSort => SERVICE_SORTS.some((sort) => sort === value);

const serviceLabel = (service: DashboardServiceItem) => (service.type === 'package' ? `${service.name} (pacote)` : service.name);

export function TopServicesCard({ businessId, filters }: BreakdownCardProps) {
  const [sort, setSort] = useState<ServiceSort>('revenue');
  const query = useQuery(dashboardQueries.services(businessId, filters));
  const items = (query.data?.items ?? [])
    .toSorted((a, b) => b[sort] - a[sort])
    .slice(0, TOP_SERVICES)
    .map(
      (service): RankingItem => ({
        key: `${service.type}-${service.id}`,
        label: serviceLabel(service),
        value: service[sort],
        details: [
          { label: 'Faturamento', value: formatCurrency(service.revenue) },
          { label: 'Vezes atendido', value: formatInteger(service.quantity) },
        ],
      }),
    );

  return (
    <ChartCard
      title="Serviços mais vendidos"
      description={
        <ToggleGroup
          aria-label="Ordenar serviços"
          variant="outline"
          size="sm"
          spacing={0}
          value={[sort]}
          onValueChange={([next]) => isServiceSort(next) && setSort(next)}
          className="mt-1"
        >
          <ToggleGroupItem value="revenue" className="px-3">
            Por faturamento
          </ToggleGroupItem>
          <ToggleGroupItem value="quantity" className="px-3">
            Por quantidade
          </ToggleGroupItem>
        </ToggleGroup>
      }
      state={stateOf(query, items.length > 0)}
      isRefreshing={query.isPlaceholderData}
      onRetry={() => void query.refetch()}
      table={rankingTable(items, 'Serviço')}
    >
      <RankingChart items={items} formatValue={sort === 'revenue' ? formatCurrency : formatInteger} />
    </ChartCard>
  );
}

export function PaymentMethodsCard({ businessId, filters }: BreakdownCardProps) {
  const query = useQuery(dashboardQueries.paymentMethods(businessId, filters));
  const items = (query.data?.items ?? []).map(
    (method): RankingItem => ({
      key: method.paymentMethodId,
      label: method.name,
      value: method.received,
      details: [
        { label: 'Recebido', value: formatCurrency(method.received) },
        { label: 'Pagamentos', value: formatInteger(method.payments) },
      ],
    }),
  );

  return (
    <ChartCard
      title="Recebido por forma de pagamento"
      description="Pagamentos pela data em que o dinheiro entrou."
      state={stateOf(query, items.length > 0)}
      isRefreshing={query.isPlaceholderData}
      emptyText="Nenhum pagamento recebido neste período."
      onRetry={() => void query.refetch()}
      table={rankingTable(items, 'Forma de pagamento')}
    >
      <RankingChart items={items} formatValue={formatCurrency} />
    </ChartCard>
  );
}
