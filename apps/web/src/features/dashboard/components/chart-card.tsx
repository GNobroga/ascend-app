import { Button } from '@packages/ui/components/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/components/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@packages/ui/components/table';
import { cn } from '@packages/ui/lib/utils';
import { ChartColumnIcon, CircleAlertIcon, RotateCwIcon, TableIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

type ChartCardProps = {
  title: string;
  description?: ReactNode;
  state: 'loading' | 'error' | 'empty' | 'ready';
  isRefreshing?: boolean;
  emptyText?: string;
  onRetry: () => void;
  table?: ChartTableData;
  children: ReactNode;
};

export function ChartCard({
  title,
  description,
  state,
  isRefreshing = false,
  emptyText = 'Sem atendimentos neste período.',
  onRetry,
  table,
  children,
}: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);
  const canShowTable = table !== undefined && state === 'ready';

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {canShowTable && (
          <CardAction>
            <Button type="button" variant="ghost" size="sm" aria-pressed={showTable} onClick={() => setShowTable(!showTable)}>
              {showTable ? <ChartColumnIcon /> : <TableIcon />}
              {showTable ? 'Ver gráfico' : 'Ver dados'}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <ErrorBoundary FallbackComponent={ChartRenderError}>
          <ChartCardBody state={state} isRefreshing={isRefreshing} emptyText={emptyText} onRetry={onRetry}>
            {canShowTable && showTable ? <ChartTable title={title} data={table} /> : children}
          </ChartCardBody>
        </ErrorBoundary>
      </CardContent>
    </Card>
  );
}

type ChartTableRow = {
  key: string;
  cells: string[];
};

export type ChartTableData = {
  columns: string[];
  rows: ChartTableRow[];
};

function ChartTable({ title, data }: { title: string; data: ChartTableData }) {
  return (
    <div className="max-h-80 overflow-auto">
      <Table>
        <TableCaption className="sr-only">{title}</TableCaption>
        <TableHeader>
          <TableRow>
            {data.columns.map((column, index) => (
              <TableHead key={column} className={cn(index > 0 && 'text-right')}>
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row) => (
            <TableRow key={row.key}>
              {row.cells.map((cell, index) => (
                <TableCell
                  key={data.columns[index] ?? index}
                  className={cn(index === 0 ? 'first-letter:uppercase' : 'text-right tabular-nums')}
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ChartRenderError({ resetErrorBoundary }: FallbackProps) {
  return (
    <ChartCardBody state="error" isRefreshing={false} emptyText="" onRetry={resetErrorBoundary}>
      {null}
    </ChartCardBody>
  );
}

type ChartCardBodyProps =Required<Pick<ChartCardProps, 'state' | 'isRefreshing' | 'emptyText' | 'onRetry' | 'children'>>;

function ChartCardBody({ state, isRefreshing, emptyText, onRetry, children }: ChartCardBodyProps) {
  if (state === 'error') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
        <CircleAlertIcon className="size-5" aria-hidden />
        Não foi possível carregar este gráfico.
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RotateCwIcon />
          Tentar de novo
        </Button>
      </div>
    );
  }
  if (state === 'empty') {
    return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">{emptyText}</p>;
  }

  const isDimmed = state === 'loading' || isRefreshing;
  return (
    <div aria-busy={isDimmed} className={cn('transition-opacity', isDimmed && 'opacity-50')}>
      {children}
    </div>
  );
}

export type LegendItem = {
  label: string;
  color: string;
  mark: 'line' | 'rect';
};

export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn('shrink-0', item.mark === 'line' ? 'h-0.5 w-3 rounded-full' : 'size-2.5 rounded-[3px]')}
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export type TooltipRow = {
  label: string;
  value: string;
  color?: string;
};

export function ChartTooltipCard({ heading, rows }: { heading: string; rows: TooltipRow[] }) {
  return (
    <div className="grid min-w-44 gap-1.5 rounded-xl border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-medium first-letter:uppercase">{heading}</p>
      <dl className="grid gap-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2">
            {row.color && (
              <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
            )}
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="ml-auto pl-3 font-medium text-foreground tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
