import { createDataTableColumnHelper, DataTable } from '@packages/ui/components/data-table';
import { cn } from '@packages/ui/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRightIcon } from 'lucide-react';
import { Link } from 'react-router';
import { formatCurrency } from '@/shared/lib/format-currency';
import { servicesSummary, STATUS_DOT_CLASSES, STATUS_LABELS } from '../appointment-status';
import { formatTime, toZoned } from '../calendar';
import type { Appointment } from '../types';

const column = createDataTableColumnHelper<Appointment>();

type CustomerAppointmentsTableProps = {
  appointments: Appointment[];
  timeZone: string;
  linkOf: (appointment: Appointment) => string;
  className?: string;
};

export function CustomerAppointmentsTable({ appointments, timeZone, linkOf, className }: CustomerAppointmentsTableProps) {
  const columns = createAppointmentColumns(timeZone, linkOf);

  return (
    <DataTable
      columns={columns}
      data={appointments}
      getRowId={(appointment) => appointment.id}
      className={className}
    />
  );
}

const createAppointmentColumns = (timeZone: string, linkOf: (appointment: Appointment) => string) =>
  column.columns([
    column.accessor('startAt', {
      header: 'Data',
      enableSorting: false,
      cell: ({ row }) => {
        const start = toZoned(row.original.startAt, timeZone);
        return (
          <Link
            to={linkOf(row.original)}
            className="flex flex-col rounded-sm tabular-nums outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <span className="font-medium">{format(start, 'dd/MM/yyyy')}</span>
            <span className="text-muted-foreground">
              {format(start, 'EEE', { locale: ptBR })} · {formatTime(start)}
            </span>
          </Link>
        );
      },
    }),
    column.accessor((appointment) => servicesSummary(appointment), {
      id: 'services',
      header: 'Serviços',
      enableSorting: false,
      cell: ({ getValue }) => <span className="block max-w-xs truncate">{getValue()}</span>,
    }),
    column.accessor((appointment) => appointment.professional.name, {
      id: 'professional',
      header: 'Profissional',
      enableSorting: false,
    }),
    column.accessor('totalPrice', {
      header: 'Valor',
      enableSorting: false,
      meta: { className: 'text-right' },
      cell: ({ getValue }) => <span className="font-medium tabular-nums">{formatCurrency(getValue())}</span>,
    }),
    column.accessor('status', {
      header: 'Status',
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className={cn('size-2 rounded-full', STATUS_DOT_CLASSES[getValue()])} />
          {STATUS_LABELS[getValue()]}
        </span>
      ),
    }),
    column.display({
      id: 'open',
      header: () => <span className="sr-only">Abrir</span>,
      meta: { className: 'w-0 text-right' },
      cell: ({ row }) => (
        <Link
          to={linkOf(row.original)}
          tabIndex={-1}
          aria-hidden
          className="inline-flex text-muted-foreground hover:text-foreground"
        >
          <ChevronRightIcon className="size-4" />
        </Link>
      ),
    }),
  ]);
