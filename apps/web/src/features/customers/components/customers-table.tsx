import { Avatar, AvatarFallback } from '@packages/ui/components/avatar';
import { Badge } from '@packages/ui/components/badge';
import { createDataTableColumnHelper, DataTable } from '@packages/ui/components/data-table';
import { BanIcon, ChevronRightIcon } from 'lucide-react';
import { Link } from 'react-router';
import { initialsOf } from '@/shared/lib/initials';
import { formatStoredPhone } from '@/shared/lib/masks';
import type { Customer } from '../types';

const column = createDataTableColumnHelper<Customer>();

type CustomersTableProps = {
  customers: Customer[];
  customerPath: (customer: Customer) => string;
  className?: string;
};

export function CustomersTable({ customers, customerPath, className }: CustomersTableProps) {
  const columns = createCustomerColumns(customerPath);

  return (
    <DataTable columns={columns} data={customers} getRowId={(customer) => customer.id} className={className} />
  );
}

const createCustomerColumns = (customerPath: (customer: Customer) => string) =>
  column.columns([
    column.accessor('name', {
      header: 'Cliente',
      enableSorting: false,
      cell: ({ row }) => <CustomerNameCell customer={row.original} to={customerPath(row.original)} />,
    }),
    column.accessor('phone', {
      header: 'Telefone',
      enableSorting: false,
      cell: ({ getValue }) => <OptionalValue value={formatOptionalPhone(getValue())} />,
    }),
    column.accessor('email', {
      header: 'E-mail',
      enableSorting: false,
      cell: ({ getValue }) => <OptionalValue value={getValue()} className="block max-w-64 truncate" />,
    }),
    column.accessor('noShowCount', {
      header: 'Faltas',
      enableSorting: false,
      meta: { className: 'text-right' },
      cell: ({ getValue }) => (
        <span className={getValue() > 0 ? 'font-medium tabular-nums' : 'text-muted-foreground tabular-nums'}>
          {getValue()}
        </span>
      ),
    }),
    column.display({
      id: 'open',
      header: () => <span className="sr-only">Abrir</span>,
      meta: { className: 'w-0 text-right' },
      cell: ({ row }) => (
        <Link
          to={customerPath(row.original)}
          tabIndex={-1}
          aria-hidden
          className="inline-flex text-muted-foreground hover:text-foreground"
        >
          <ChevronRightIcon className="size-4" />
        </Link>
      ),
    }),
  ]);

const formatOptionalPhone = (phone: string | null) => (phone ? formatStoredPhone(phone) : null);

type OptionalValueProps = {
  value: string | null;
  className?: string;
};

function OptionalValue({ value, className }: OptionalValueProps) {
  if (!value) return <span className="text-muted-foreground">Não informado</span>;

  return <span className={className}>{value}</span>;
}

type CustomerNameCellProps = {
  customer: Customer;
  to: string;
};

function CustomerNameCell({ customer, to }: CustomerNameCellProps) {
  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarFallback>{initialsOf(customer.name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Link
          to={to}
          className="max-w-xs truncate rounded-sm font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          {customer.name}
        </Link>
        {customer.activeBlock && (
          <Badge variant="destructive">
            <BanIcon />
            Bloqueado
          </Badge>
        )}
      </div>
    </div>
  );
}
