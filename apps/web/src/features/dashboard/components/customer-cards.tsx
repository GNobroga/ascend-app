import { Button } from '@packages/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/components/card';
import { cn } from '@packages/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CircleAlertIcon, MessageCircleIcon, RotateCwIcon } from 'lucide-react';
import { Link } from 'react-router';
import { customerPath } from '@/features/customers';
import { formatStoredPhone, onlyDigits } from '@/shared/lib/masks';
import { dashboardQueries } from '../api/dashboard.queries';
import { formatInteger, formatRate } from '../format';
import type { DashboardInactiveCustomers, DashboardSummary } from '../types';

type CustomersOverviewCardProps = {
  summary: DashboardSummary | undefined;
  isRefreshing: boolean;
};

export function CustomersOverviewCard({ summary, isRefreshing }: CustomersOverviewCardProps) {
  const current = summary?.current;
  const served = current?.customersServed ?? 0;
  const newShare = current && served > 0 ? current.newCustomers / served : null;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Clientes</CardTitle>
        <CardDescription>Quem foi atendido no período.</CardDescription>
      </CardHeader>
      <CardContent className={cn('flex flex-col gap-5 transition-opacity', isRefreshing && 'opacity-50')}>
        <dl className="grid grid-cols-3 gap-3">
          <Figure label="Atendidos" value={current ? formatInteger(served) : '–'} />
          <Figure label="Novos" value={current ? formatInteger(current.newCustomers) : '–'} />
          <Figure label="Recorrentes" value={current ? formatInteger(current.returningCustomers) : '–'} />
        </dl>
        {newShare !== null && (
          <div className="flex flex-col gap-1.5">
            <div aria-hidden className="flex h-2 gap-0.5 overflow-hidden rounded-full">
              <span className="rounded-l-full bg-chart-1" style={{ flexGrow: current?.newCustomers ?? 0 }} />
              <span className="rounded-r-full bg-chart-2" style={{ flexGrow: current?.returningCustomers ?? 0 }} />
            </div>
            <p className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-[3px] bg-chart-1" />
                {formatRate(newShare)} novos
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-[3px] bg-chart-2" />
                {formatRate(1 - newShare)} recorrentes
              </span>
            </p>
          </div>
        )}
        <OnlineShare summary={summary} />
      </CardContent>
    </Card>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tracking-tight">{value}</dd>
    </div>
  );
}

function OnlineShare({ summary }: { summary: DashboardSummary | undefined }) {
  const current = summary?.current.onlineShare ?? null;
  const previous = summary?.previous.onlineShare ?? null;
  const delta = current !== null && previous !== null ? current - previous : null;
  const points = delta === null ? null : Math.round(delta * 1000) / 10;

  return (
    <div className="flex flex-col gap-0.5 border-t pt-4">
      <p className="text-sm text-muted-foreground">Agendados pela página pública</p>
      <p className="text-2xl font-semibold tracking-tight">{current === null ? '–' : formatRate(current)}</p>
      <p className="text-xs text-muted-foreground">
        {points === null
          ? 'Dos agendamentos com início no período.'
          : `${points > 0 ? '+' : ''}${points.toLocaleString('pt-BR')} p.p. vs. período anterior`}
      </p>
    </div>
  );
}

type InactiveCustomersCardProps = {
  businessId: string;
  professionalId: string | null;
};

export function InactiveCustomersCard({ businessId, professionalId }: InactiveCustomersCardProps) {
  const query = useQuery(dashboardQueries.inactiveCustomers(businessId, professionalId));
  const { data } = query;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Clientes que sumiram</CardTitle>
        <CardDescription>
          Voltavam com frequência e estão há mais de {data?.inactiveAfterDays ?? 60} dias sem atendimento, sem nada
          agendado.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {query.isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-8 text-center text-sm text-muted-foreground">
            <CircleAlertIcon className="size-5" aria-hidden />
            Não foi possível carregar a lista.
            <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
              <RotateCwIcon />
              Tentar de novo
            </Button>
          </div>
        ) : (
          <InactiveCustomersList businessId={businessId} data={data} isRefreshing={query.isPlaceholderData} />
        )}
      </CardContent>
    </Card>
  );
}

type InactiveCustomersListProps = {
  businessId: string;
  data: DashboardInactiveCustomers | undefined;
  isRefreshing: boolean;
};

function InactiveCustomersList({ businessId, data, isRefreshing }: InactiveCustomersListProps) {
  if (!data) {
    return <p className="px-6 text-sm text-muted-foreground">Carregando…</p>;
  }
  if (data.items.length === 0) {
    return <p className="px-6 text-sm text-muted-foreground">Nenhum cliente sumido. Bom sinal!</p>;
  }

  return (
    <div className={cn('flex flex-col gap-2 transition-opacity', isRefreshing && 'opacity-50')}>
      <ul className="flex flex-col divide-y">
        {data.items.map((customer) => (
          <li key={customer.customerId} className="flex items-center gap-3 px-6 py-2.5">
            <Link
              to={customerPath(businessId, customer.customerId)}
              className="flex min-w-0 flex-1 flex-col rounded-md outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="truncate font-medium">{customer.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                Último atendimento há{' '}
                {formatDistanceToNowStrict(new Date(customer.lastCompletedAt), { locale: ptBR })} ·{' '}
                {formatInteger(customer.completedCount)} atendimentos
              </span>
            </Link>
            {customer.phone && (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <a
                    href={`https://wa.me/${onlyDigits(customer.phone)}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Chamar ${customer.name} no WhatsApp (${formatStoredPhone(customer.phone)})`}
                  />
                }
              >
                <MessageCircleIcon />
                WhatsApp
              </Button>
            )}
          </li>
        ))}
      </ul>
      {data.total > data.items.length && (
        <p className="px-6 text-xs text-muted-foreground">
          Mostrando {data.items.length} de {formatInteger(data.total)} clientes.
        </p>
      )}
    </div>
  );
}
