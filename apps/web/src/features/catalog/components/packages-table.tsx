import { Badge } from '@packages/ui/components/badge';
import { createDataTableColumnHelper, DataTable } from '@packages/ui/components/data-table';
import { formatCurrency } from '@/shared/lib/format-currency';
import { formatMinutes } from '@/shared/lib/format-duration';
import { packageDiscount } from '../package-pricing';
import type { Package } from '../types';
import { CatalogThumbnail } from './catalog-thumbnail';
import { PackageActionsMenu, type PackageActions } from './package-actions-menu';
import { PackageWarnings } from './package-warnings';

const column = createDataTableColumnHelper<Package>();

const professionalCountLabel = (count: number) => (count === 1 ? '1 profissional' : `${count} profissionais`);

type PackagesTableProps = {
  packages: Package[];
  actions: PackageActions | null;
  onView: (item: Package) => void;
};

export function PackagesTable({ packages, actions, onView }: PackagesTableProps) {
  const columns = createPackageColumns(actions, onView);

  return <DataTable columns={columns} data={packages} getRowId={(item) => item.id} />;
}

const createPackageColumns = (actions: PackageActions | null, onView: (item: Package) => void) =>
  column.columns([
    column.accessor('name', {
      header: 'Pacote',
      sortFn: 'text',
      cell: ({ row }) => <PackageNameCell item={row.original} actions={actions} onView={onView} />,
    }),
    column.accessor('durationMinutes', {
      header: 'Duração',
      sortFn: 'basic',
      cell: ({ getValue }) => formatMinutes(getValue()),
    }),
    column.accessor('servicesPrice', {
      header: 'Serviços avulsos',
      sortFn: 'basic',
      meta: { className: 'text-right' },
      cell: ({ getValue }) => <span className="text-muted-foreground tabular-nums">{formatCurrency(getValue())}</span>,
    }),
    column.accessor('price', {
      header: 'Preço',
      sortFn: 'basic',
      meta: { className: 'text-right' },
      cell: ({ getValue }) => <span className="font-medium tabular-nums">{formatCurrency(getValue())}</span>,
    }),
    column.accessor((item) => packageDiscount(item.price, item.servicesPrice)?.percent ?? 0, {
      id: 'discount',
      header: 'Desconto',
      sortFn: 'basic',
      meta: { className: 'text-right' },
      cell: ({ getValue }) => <DiscountCell percent={getValue()} />,
    }),
    column.accessor((item) => item.professionals.length, {
      id: 'professionals',
      header: 'Profissionais',
      sortFn: 'basic',
      cell: ({ getValue }) => <ProfessionalsCell count={getValue()} />,
    }),
    column.accessor('isActive', {
      header: 'Status',
      sortFn: 'basic',
      cell: ({ row }) => <StatusCell item={row.original} />,
    }),
    ...(actions
      ? [
          column.display({
            id: 'actions',
            header: () => <span className="sr-only">Ações</span>,
            meta: { className: 'w-0 text-right' },
            cell: ({ row }) => <PackageActionsMenu item={row.original} actions={actions} />,
          }),
        ]
      : []),
  ]);

function DiscountCell({ percent }: { percent: number }) {
  if (percent <= 0) return <span className="text-muted-foreground">—</span>;
  return <span className="tabular-nums">−{percent}%</span>;
}

function ProfessionalsCell({ count }: { count: number }) {
  if (count === 0) return <span className="text-muted-foreground">Nenhum</span>;
  return professionalCountLabel(count);
}

function StatusCell({ item }: { item: Package }) {
  return (
    <span className="flex items-center gap-2">
      {item.isActive ? <Badge variant="outline">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
      <PackageWarnings item={item} />
    </span>
  );
}

type PackageNameCellProps = {
  item: Package;
  actions: PackageActions | null;
  onView: (item: Package) => void;
};

function PackageNameCell({ item, actions, onView }: PackageNameCellProps) {
  const handleThumbnailClick = () => {
    if (item.coverImageUrl) onView(item);
    else actions?.onEditPhotos(item);
  };

  return (
    <div className="flex items-center gap-3">
      <CatalogThumbnail
        imageUrl={item.coverImageUrl}
        name={item.name}
        onClick={item.coverImageUrl || actions ? handleThumbnailClick : undefined}
      />
      <div className="flex max-w-xs min-w-0 flex-col gap-0.5">
        {actions ? (
          <button
            type="button"
            className="truncate rounded-sm text-left font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
            onClick={() => actions.onEdit(item)}
          >
            {item.name}
          </button>
        ) : (
          <span className="truncate font-medium">{item.name}</span>
        )}
        <span className="truncate text-muted-foreground">
          {item.services.map((service) => service.name).join(' + ')}
        </span>
      </div>
    </div>
  );
}
