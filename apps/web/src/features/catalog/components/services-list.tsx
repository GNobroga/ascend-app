import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/components/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@packages/ui/components/empty';
import { toast } from '@packages/ui/components/sonner';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ClockIcon, PlusIcon, ScissorsIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useState } from 'react';
import { formatCurrency } from '@/shared/lib/format-currency';
import { formatMinutes } from '@/shared/lib/format-duration';
import { useUpdateService } from '../api/catalog.mutations';
import { catalogQueries } from '../api/catalog.queries';
import { matchesCatalogFilters, UNCATEGORIZED_LABEL } from '../filters';
import { catalogViewSearchParams, serviceFilterSearchParams, UNCATEGORIZED_FILTER } from '../search-params';
import type { Service, ServiceGroup } from '../types';
import { useCanManageCatalog } from '../use-can-manage-catalog';
import { CatalogImageViewer } from './catalog-image-viewer';
import { CatalogThumbnail } from './catalog-thumbnail';
import { CatalogViewToggle } from './catalog-view-toggle';
import { DeleteServiceDialog } from './delete-service-dialog';
import { NoResults } from './no-results';
import { ServiceActionsMenu, type ServiceActions } from './service-actions-menu';
import { ServiceFilters } from './service-filters';
import { ServiceFormSheet } from './service-form-sheet';
import { ServicesGrid } from './services-grid';
import { ServicesTable } from './services-table';

type ServicesListProps = {
  businessId: string;
};

export function ServicesList({ businessId }: ServicesListProps) {
  const { data: services } = useSuspenseQuery(catalogQueries.services(businessId));
  const { data: categories } = useSuspenseQuery(catalogQueries.categories(businessId));
  const [{ q, status, category }, setFilters] = useQueryStates(serviceFilterSearchParams);
  const [{ view }] = useQueryStates(catalogViewSearchParams);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [focusPhotos, setFocusPhotos] = useState(false);
  const [viewingService, setViewingService] = useState<Service | null>(null);
  const [editingService, setEditingService] = useState<Service | undefined>();
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const updateService = useUpdateService(businessId);

  const canManage = useCanManageCatalog(businessId);

  const openCreate = () => {
    setEditingService(undefined);
    setFocusPhotos(false);
    setIsFormOpen(true);
  };

  const actions: ServiceActions | null = canManage
    ? {
        onEdit: (service) => {
          setEditingService(service);
          setFocusPhotos(false);
          setIsFormOpen(true);
        },
        onEditPhotos: (service) => {
          setEditingService(service);
          setFocusPhotos(true);
          setIsFormOpen(true);
        },
        onToggleActive: (service) => {
          updateService.mutate(
            { serviceId: service.id, body: { isActive: !service.isActive } },
            { onSuccess: (updated) => toast.success(updated.isActive ? 'Serviço ativado.' : 'Serviço inativado.') },
          );
        },
        onDelete: setDeletingService,
      }
    : null;

  const filtered = services.filter(
    (service) =>
      matchesCatalogFilters({ isActive: service.isActive, searchableTexts: [service.name] }, { q, status }) &&
      (category === null || (service.categoryId ?? UNCATEGORIZED_FILTER) === category),
  );

  const groups: ServiceGroup[] = [
    ...categories.map(({ id, name, isActive }) => ({
      id,
      name,
      isActive,
      services: filtered.filter((service) => service.categoryId === id),
    })),
    {
      id: UNCATEGORIZED_FILTER,
      name: UNCATEGORIZED_LABEL,
      isActive: true,
      services: filtered.filter((service) => service.categoryId === null),
    },
  ].filter((group) => group.services.length > 0);

  const newServiceButton = canManage && (
    <Button type="button" onClick={openCreate}>
      <PlusIcon />
      Novo serviço
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      {services.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScissorsIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum serviço cadastrado</EmptyTitle>
            <EmptyDescription>Os serviços são o que seus clientes agendam, com preço e duração.</EmptyDescription>
          </EmptyHeader>
          {newServiceButton && <EmptyContent>{newServiceButton}</EmptyContent>}
        </Empty>
      ) : (
        <>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <ServiceFilters categories={categories} />
            <div className="flex items-center gap-2">
              <CatalogViewToggle />
              {newServiceButton}
            </div>
          </div>

          {filtered.length === 0 && (
            <NoResults
              title="Nenhum serviço encontrado"
              onClearFilters={() => void setFilters({ q: null, status: null, category: null })}
            />
          )}

          {filtered.length > 0 && view === 'table' && (
            <ServicesTable services={filtered} categories={categories} actions={actions} onView={setViewingService} />
          )}

          {view === 'grid' && groups.length > 0 && (
            <ServicesGrid groups={groups} actions={actions} onView={setViewingService} />
          )}

          {view === 'list' &&
            groups.map((group) => (
              <ServiceGroupCard key={group.id} group={group} actions={actions} onView={setViewingService} />
            ))}
        </>
      )}

      {viewingService && (
        <CatalogImageViewer
          businessId={businessId}
          owner={{ kind: 'services', id: viewingService.id }}
          onClose={() => setViewingService(null)}
        />
      )}

      {canManage && (
        <>
          <ServiceFormSheet
            businessId={businessId}
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            focusPhotos={focusPhotos}
            service={editingService}
          />
          <DeleteServiceDialog
            businessId={businessId}
            service={deletingService}
            onOpenChange={(open) => {
              if (!open) setDeletingService(null);
            }}
          />
        </>
      )}
    </div>
  );
}

type ServiceGroupCardProps = {
  group: ServiceGroup;
  actions: ServiceActions | null;
  onView: (service: Service) => void;
};

function ServiceGroupCard({ group, actions, onView }: ServiceGroupCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {group.name}
          <span className="text-sm font-normal text-muted-foreground">{group.services.length}</span>
          {!group.isActive && <Badge variant="outline">Categoria inativa</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {group.services.map((service) => (
            <ServiceRow key={service.id} service={service} actions={actions} onView={onView} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

type ServiceRowProps = {
  service: Service;
  actions: ServiceActions | null;
  onView: (service: Service) => void;
};

function ServiceRow({ service, actions, onView }: ServiceRowProps) {
  const handleThumbnailClick = () => {
    if (service.coverImageUrl) onView(service);
    else actions?.onEditPhotos(service);
  };

  return (
    <li className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
      <CatalogThumbnail
        imageUrl={service.coverImageUrl}
        name={service.name}
        onClick={service.coverImageUrl || actions ? handleThumbnailClick : undefined}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2 font-medium">
            {actions ? (
              <button
                type="button"
                className="truncate rounded-sm text-left outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
                onClick={() => actions.onEdit(service)}
              >
                {service.name}
              </button>
            ) : (
              <span className="truncate">{service.name}</span>
            )}
            {!service.isActive && <Badge variant="secondary">Inativo</Badge>}
          </span>
          {service.description && (
            <span className="line-clamp-1 text-sm text-muted-foreground">{service.description}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <ClockIcon className="size-4" />
            {formatMinutes(service.durationInMinutes)}
          </span>
          <span className="w-24 text-right font-medium tabular-nums">{formatCurrency(service.price)}</span>
        </div>
      </div>

      {actions && <ServiceActionsMenu service={service} actions={actions} />}
    </li>
  );
}
