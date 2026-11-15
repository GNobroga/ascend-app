import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@packages/ui/components/empty';
import { toast } from '@packages/ui/components/sonner';
import { cn } from '@packages/ui/lib/utils';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ClockIcon, PackageIcon, PlusIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useState, type ReactNode } from 'react';
import { formatCurrency } from '@/shared/lib/format-currency';
import { formatMinutes } from '@/shared/lib/format-duration';
import { useReorderPackages, useUpdatePackage } from '../api/catalog.mutations';
import { catalogQueries } from '../api/catalog.queries';
import { createAnnouncements, screenReaderInstructions, useSortableSensors } from '../drag-and-drop';
import { matchesCatalogFilters } from '../filters';
import { packageDiscount } from '../package-pricing';
import { catalogFilterSearchParams, catalogViewSearchParams } from '../search-params';
import type { Package } from '../types';
import { useCanManageCatalog } from '../use-can-manage-catalog';
import { CatalogFilters } from './catalog-filters';
import { CatalogImageViewer } from './catalog-image-viewer';
import { CatalogThumbnail } from './catalog-thumbnail';
import { CatalogViewToggle } from './catalog-view-toggle';
import { DeletePackageDialog } from './delete-package-dialog';
import { DragHandle } from './drag-handle';
import { NoResults } from './no-results';
import { PackageActionsMenu, type PackageActions } from './package-actions-menu';
import { PackageFormSheet } from './package-form-sheet';
import { PackageWarnings } from './package-warnings';
import { PackagesGrid } from './packages-grid';
import { PackagesTable } from './packages-table';

const ROW_CLASS = 'flex items-center gap-4 py-3 first:pt-0 last:pb-0';

type PackagesListProps = {
  businessId: string;
};

export function PackagesList({ businessId }: PackagesListProps) {
  const { data: savedPackages } = useSuspenseQuery(catalogQueries.packages(businessId));
  const [draftOrder, setDraftOrder] = useState<Package[] | null>(null);
  const packages = draftOrder ?? savedPackages;
  const [{ view }] = useQueryStates(catalogViewSearchParams);
  const [{ q, status }, setFilters] = useQueryStates(catalogFilterSearchParams);
  const canManage = useCanManageCatalog(businessId);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [focusPhotos, setFocusPhotos] = useState(false);
  const [viewingPackage, setViewingPackage] = useState<Package | null>(null);
  const [editingPackage, setEditingPackage] = useState<Package | undefined>();
  const [deletingPackage, setDeletingPackage] = useState<Package | null>(null);
  const updatePackage = useUpdatePackage(businessId);
  const reorderPackages = useReorderPackages(businessId);
  const sensors = useSortableSensors();

  const nameOf = (id: string | number) => packages.find((item) => item.id === id)?.name ?? '';

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const from = packages.findIndex((item) => item.id === active.id);
    const to = packages.findIndex((item) => item.id === over.id);
    if (from === -1 || to === -1) return;

    const reordered = arrayMove(packages, from, to);
    setDraftOrder(reordered);
    reorderPackages.mutate(reordered, { onSettled: () => setDraftOrder(null) });
  };

  const openCreate = () => {
    setEditingPackage(undefined);
    setFocusPhotos(false);
    setIsFormOpen(true);
  };

  const actions: PackageActions | null = canManage
    ? {
        onEdit: (item) => {
          setEditingPackage(item);
          setFocusPhotos(false);
          setIsFormOpen(true);
        },
        onEditPhotos: (item) => {
          setEditingPackage(item);
          setFocusPhotos(true);
          setIsFormOpen(true);
        },
        onToggleActive: (item) => {
          updatePackage.mutate(
            { packageId: item.id, body: { isActive: !item.isActive } },
            { onSuccess: (updated) => toast.success(updated.isActive ? 'Pacote ativado.' : 'Pacote inativado.') },
          );
        },
        onDelete: setDeletingPackage,
      }
    : null;

  const filtered = packages.filter((item) =>
    matchesCatalogFilters(
      { isActive: item.isActive, searchableTexts: [item.name, ...item.services.map((service) => service.name)] },
      { q, status },
    ),
  );

  const newPackageButton = canManage && (
    <Button type="button" onClick={openCreate}>
      <PlusIcon />
      Novo pacote
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      {packages.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum pacote</EmptyTitle>
            <EmptyDescription>
              Combine serviços feitos juntos, como “Corte + Barba”, com um preço especial.
            </EmptyDescription>
          </EmptyHeader>
          {newPackageButton && <EmptyContent>{newPackageButton}</EmptyContent>}
        </Empty>
      ) : (
        <>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <CatalogFilters searchLabel="Buscar pacote ou serviço" activeLabel="Ativos" inactiveLabel="Inativos" />
            <div className="flex items-center gap-2">
              <CatalogViewToggle />
              {newPackageButton}
            </div>
          </div>
          {filtered.length === 0 && (
            <NoResults
              title="Nenhum pacote encontrado"
              onClearFilters={() => void setFilters({ q: null, status: null })}
            />
          )}
          {filtered.length > 0 && view === 'table' && (
            <PackagesTable packages={filtered} actions={actions} onView={setViewingPackage} />
          )}
          {filtered.length > 0 && view === 'grid' && (
            <PackagesGrid packages={filtered} actions={actions} onView={setViewingPackage} />
          )}
          {filtered.length > 0 && view === 'list' && canManage && (
            <p className="text-sm text-muted-foreground">
              Arraste os pacotes para definir a ordem em que aparecem no catálogo.
            </p>
          )}
          {filtered.length > 0 && view === 'list' && (
            <Card>
              <CardContent>
                {canManage ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                    accessibility={{ announcements: createAnnouncements(nameOf), screenReaderInstructions }}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={filtered} strategy={verticalListSortingStrategy}>
                      <ul className="flex flex-col divide-y">
                        {filtered.map((item) => (
                          <SortablePackageRow key={item.id} item={item} disabled={reorderPackages.isPending}>
                            {(dragHandle) => (
                              <PackageRowContent
                                item={item}
                                actions={actions}
                                onView={setViewingPackage}
                                dragHandle={dragHandle}
                              />
                            )}
                          </SortablePackageRow>
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <ul className="flex flex-col divide-y">
                    {filtered.map((item) => (
                      <li key={item.id} className={ROW_CLASS}>
                        <PackageRowContent item={item} actions={null} onView={setViewingPackage} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {viewingPackage && (
        <CatalogImageViewer
          businessId={businessId}
          owner={{ kind: 'packages', id: viewingPackage.id }}
          onClose={() => setViewingPackage(null)}
        />
      )}

      {canManage && (
        <>
          <PackageFormSheet
            businessId={businessId}
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            focusPhotos={focusPhotos}
            item={editingPackage}
          />
          <DeletePackageDialog
            businessId={businessId}
            item={deletingPackage}
            onOpenChange={(open) => {
              if (!open) setDeletingPackage(null);
            }}
          />
        </>
      )}
    </div>
  );
}

type SortablePackageRowProps = {
  item: Package;
  disabled: boolean;
  children: (dragHandle: ReactNode) => ReactNode;
};

function SortablePackageRow({ item, disabled, children }: SortablePackageRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
    attributes: { roleDescription: 'pacote ordenável' },
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(ROW_CLASS, 'bg-card', isDragging && 'relative z-10 opacity-80')}
    >
      {children(
        <DragHandle
          label={`Mover ${item.name}`}
          attributes={attributes}
          listeners={listeners}
          setActivatorNodeRef={setActivatorNodeRef}
        />,
      )}
    </li>
  );
}

type PackageRowContentProps = {
  item: Package;
  actions: PackageActions | null;
  onView: (item: Package) => void;
  dragHandle?: ReactNode;
};

function PackageRowContent({ item, actions, onView, dragHandle }: PackageRowContentProps) {
  const handleThumbnailClick = () => {
    if (item.coverImageUrl) onView(item);
    else actions?.onEditPhotos(item);
  };

  const discount = packageDiscount(item.price, item.servicesPrice);

  return (
    <>
      {dragHandle && <div className="-ml-2">{dragHandle}</div>}
      <CatalogThumbnail
        imageUrl={item.coverImageUrl}
        name={item.name}
        onClick={item.coverImageUrl || actions ? handleThumbnailClick : undefined}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2 font-medium">
            {actions ? (
              <button
                type="button"
                className="truncate rounded-sm text-left outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
                onClick={() => actions.onEdit(item)}
              >
                {item.name}
              </button>
            ) : (
              <span className="truncate">{item.name}</span>
            )}
            {!item.isActive && <Badge variant="secondary">Inativo</Badge>}
            <PackageWarnings item={item} />
          </span>
          <span className="line-clamp-1 text-sm text-muted-foreground">
            {item.services.map((service) => service.name).join(' + ')}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <ClockIcon className="size-4" />
            {formatMinutes(item.durationMinutes)}
          </span>
          <span className="flex w-28 flex-col items-end">
            <span className="font-medium tabular-nums">{formatCurrency(item.price)}</span>
            {discount && (
              <span className="text-xs text-muted-foreground tabular-nums">
                <span className="line-through">{formatCurrency(item.servicesPrice)}</span> −{discount.percent}%
              </span>
            )}
          </span>
        </div>
      </div>

      {actions && <PackageActionsMenu item={item} actions={actions} />}
    </>
  );
}
