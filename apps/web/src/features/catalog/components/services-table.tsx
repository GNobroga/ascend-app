import { Badge } from '@packages/ui/components/badge';
import { createDataTableColumnHelper, DataTable } from '@packages/ui/components/data-table';
import { formatCurrency } from '@/shared/lib/format-currency';
import { formatMinutes } from '@/shared/lib/format-duration';
import type { Service, ServiceCategory } from '../types';
import { CatalogThumbnail } from './catalog-thumbnail';
import { ServiceActionsMenu, type ServiceActions } from './service-actions-menu';

const column = createDataTableColumnHelper<Service>();

type ServicesTableProps = {
  services: Service[];
  categories: ServiceCategory[];
  actions: ServiceActions | null;
  onView: (service: Service) => void;
};

export function ServicesTable({ services, categories, actions, onView }: ServicesTableProps) {
  const columns = createServiceColumns(categories, actions, onView);

  return <DataTable columns={columns} data={services} getRowId={(service) => service.id} />;
}

const createServiceColumns = (
  categories: ServiceCategory[],
  actions: ServiceActions | null,
  onView: (service: Service) => void,
) => {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const findCategory = (service: Service) => (service.categoryId ? categoriesById.get(service.categoryId) : undefined);

  return column.columns([
    column.accessor('name', {
      header: 'Serviço',
      sortFn: 'text',
      cell: ({ row }) => <ServiceNameCell service={row.original} actions={actions} onView={onView} />,
    }),
    column.accessor((service) => findCategory(service)?.name, {
      id: 'category',
      header: 'Categoria',
      sortFn: 'text',
      sortUndefined: 'last',
      cell: ({ row }) => <CategoryCell category={findCategory(row.original)} />,
    }),
    column.accessor('durationInMinutes', {
      header: 'Duração',
      sortFn: 'basic',
      cell: ({ getValue }) => formatMinutes(getValue()),
    }),
    column.accessor('price', {
      header: 'Preço',
      sortFn: 'basic',
      meta: { className: 'text-right' },
      cell: ({ getValue }) => <span className="font-medium tabular-nums">{formatCurrency(getValue())}</span>,
    }),
    column.accessor('isActive', {
      header: 'Status',
      sortFn: 'basic',
      cell: ({ getValue }) =>
        getValue() ? <Badge variant="outline">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>,
    }),
    ...(actions
      ? [
          column.display({
            id: 'actions',
            header: () => <span className="sr-only">Ações</span>,
            meta: { className: 'w-0 text-right' },
            cell: ({ row }) => <ServiceActionsMenu service={row.original} actions={actions} />,
          }),
        ]
      : []),
  ]);
};

function CategoryCell({ category }: { category: ServiceCategory | undefined }) {
  if (!category) return <span className="text-muted-foreground">Sem categoria</span>;

  return (
    <span className="flex items-center gap-2">
      {category.name}
      {!category.isActive && <Badge variant="outline">Inativa</Badge>}
    </span>
  );
}

type ServiceNameCellProps = {
  service: Service;
  actions: ServiceActions | null;
  onView: (service: Service) => void;
};

function ServiceNameCell({ service, actions, onView }: ServiceNameCellProps) {
  const handleThumbnailClick = () => {
    if (service.coverImageUrl) onView(service);
    else actions?.onEditPhotos(service);
  };

  return (
    <div className="flex items-center gap-3">
      <CatalogThumbnail
        imageUrl={service.coverImageUrl}
        name={service.name}
        onClick={service.coverImageUrl || actions ? handleThumbnailClick : undefined}
      />
      <div className="flex max-w-xs min-w-0 flex-col gap-0.5">
        {actions ? (
          <button
            type="button"
            className="truncate rounded-sm text-left font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
            onClick={() => actions.onEdit(service)}
          >
            {service.name}
          </button>
        ) : (
          <span className="truncate font-medium">{service.name}</span>
        )}
        {service.description && <span className="truncate text-muted-foreground">{service.description}</span>}
      </div>
    </div>
  );
}
