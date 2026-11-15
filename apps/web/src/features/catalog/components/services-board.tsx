import {
  closestCorners,
  DndContext,
  DragOverlay,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@packages/ui/components/badge';
import { cn } from '@packages/ui/lib/utils';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { formatCurrency } from '@/shared/lib/format-currency';
import { formatMinutes } from '@/shared/lib/format-duration';
import { useArrangeServices } from '../api/catalog.mutations';
import { catalogQueries } from '../api/catalog.queries';
import { createAnnouncements, screenReaderInstructions, useSortableSensors } from '../drag-and-drop';
import { UNCATEGORIZED_LABEL } from '../filters';
import { UNCATEGORIZED_FILTER } from '../search-params';
import type { Service, ServiceCategory } from '../types';
import { CatalogThumbnail } from './catalog-thumbnail';
import { DragHandle } from './drag-handle';

type BoardColumn = {
  id: string;
  name: string;
  isActive: boolean;
};

type ColumnItems = Record<string, string[]>;

const boardColumns = (categories: ServiceCategory[]): BoardColumn[] => [
  ...categories.map(({ id, name, isActive }) => ({ id, name, isActive })),
  { id: UNCATEGORIZED_FILTER, name: UNCATEGORIZED_LABEL, isActive: true },
];

const columnIdOf = (service: Service) => service.categoryId ?? UNCATEGORIZED_FILTER;

const groupByColumn = (columns: BoardColumn[], services: Service[]): ColumnItems =>
  Object.fromEntries(
    columns.map((column) => [
      column.id,
      services.filter((service) => columnIdOf(service) === column.id).map((service) => service.id),
    ]),
  );

const findColumnId = (items: ColumnItems, id: UniqueIdentifier) =>
  id in items ? String(id) : Object.keys(items).find((columnId) => items[columnId]?.includes(String(id)));

const serviceCountLabel = (count: number) => (count === 1 ? '1 serviço' : `${count} serviços`);

type ServicesBoardProps = {
  businessId: string;
  canManage: boolean;
  visibleColumnIds: Set<string>;
};

export function ServicesBoard({ businessId, canManage, visibleColumnIds }: ServicesBoardProps) {
  const { data: services } = useSuspenseQuery(catalogQueries.services(businessId));
  const { data: categories } = useSuspenseQuery(catalogQueries.categories(businessId));
  const arrangeServices = useArrangeServices(businessId);
  const sensors = useSortableSensors();

  const [draft, setDraft] = useState<ColumnItems | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const columns = boardColumns(categories);
  const visibleColumns = columns.filter((column) => visibleColumnIds.has(column.id));
  const items = draft ?? groupByColumn(columns, services);
  const servicesById = new Map(services.map((service) => [service.id, service]));
  const activeService = activeId ? servicesById.get(activeId) : undefined;

  const nameOf = (id: UniqueIdentifier) =>
    servicesById.get(String(id))?.name ?? columns.find((column) => column.id === id)?.name ?? '';

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    setDraft(groupByColumn(columns, services));
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;

    setDraft((current) => {
      if (!current) return current;
      const fromColumn = findColumnId(current, active.id);
      const toColumn = findColumnId(current, over.id);
      if (!fromColumn || !toColumn || fromColumn === toColumn) return current;

      const target = current[toColumn] ?? [];
      const overIndex = target.indexOf(String(over.id));
      const insertAt = overIndex === -1 ? target.length : overIndex;

      return {
        ...current,
        [fromColumn]: (current[fromColumn] ?? []).filter((id) => id !== active.id),
        [toColumn]: [...target.slice(0, insertAt), String(active.id), ...target.slice(insertAt)],
      };
    });
  };

  const resetDrag = () => {
    setActiveId(null);
    setDraft(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const serviceId = String(active.id);
    const columnId = draft ? findColumnId(draft, serviceId) : undefined;
    const service = servicesById.get(serviceId);
    if (!draft || !over || !columnId || !service) return resetDrag();

    const column = draft[columnId] ?? [];
    const overIndex = column.indexOf(String(over.id));
    const finalItems = {
      ...draft,
      [columnId]: overIndex === -1 ? column : arrayMove(column, column.indexOf(serviceId), overIndex),
    };

    const orderedServices = columns
      .flatMap((boardColumn) => finalItems[boardColumn.id] ?? [])
      .map((id) => servicesById.get(id))
      .filter((candidate) => candidate !== undefined);

    const categoryId = columnId === UNCATEGORIZED_FILTER ? null : columnId;
    const categoryChanged = service.categoryId !== categoryId;
    const orderChanged = orderedServices.some((candidate, index) => candidate.id !== services[index]?.id);

    setActiveId(null);
    if (!categoryChanged && !orderChanged) return setDraft(null);

    arrangeServices.mutate(
      { orderedServices, categoryChange: categoryChanged ? { serviceId, categoryId } : undefined },
      { onSettled: () => setDraft(null) },
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      accessibility={{ announcements: createAnnouncements(nameOf), screenReaderInstructions }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={resetDrag}
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {visibleColumns.map((column) => {
          const columnServices = (items[column.id] ?? [])
            .map((id) => servicesById.get(id))
            .filter((service) => service !== undefined);

          return (
            <BoardColumnView key={column.id} column={column} count={columnServices.length}>
              <SortableContext items={columnServices} strategy={verticalListSortingStrategy}>
                {columnServices.map((service) =>
                  canManage ? (
                    <SortableServiceCard key={service.id} service={service} disabled={arrangeServices.isPending} />
                  ) : (
                    <ServiceBoardCard key={service.id} service={service} />
                  ),
                )}
              </SortableContext>
            </BoardColumnView>
          );
        })}
      </div>

      <DragOverlay>{activeService && <ServiceBoardCard service={activeService} isOverlay />}</DragOverlay>
    </DndContext>
  );
}

type BoardColumnViewProps = {
  column: BoardColumn;
  count: number;
  children: ReactNode;
};

function BoardColumnView({ column, count, children }: BoardColumnViewProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <section
      aria-label={column.name}
      className="flex w-72 shrink-0 flex-col gap-3 rounded-[min(var(--radius-4xl),24px)] bg-muted/60 p-3"
    >
      <header className="flex items-center gap-2 px-1">
        <h2 className="truncate font-medium">{column.name}</h2>
        <span className="text-sm text-muted-foreground" aria-label={serviceCountLabel(count)}>
          {count}
        </span>
        {!column.isActive && <Badge variant="outline">Inativa</Badge>}
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-24 flex-1 flex-col gap-2 rounded-2xl transition-colors',
          isOver && 'bg-muted',
          count === 0 && 'items-center justify-center border border-dashed',
        )}
      >
        {count === 0 ? <span className="px-3 text-center text-sm text-muted-foreground">Nenhum serviço</span> : children}
      </div>
    </section>
  );
}

type SortableServiceCardProps = {
  service: Service;
  disabled: boolean;
};

function SortableServiceCard({ service, disabled }: SortableServiceCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: service.id,
    disabled,
    attributes: { roleDescription: 'serviço arrastável' },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(isDragging && 'opacity-40')}
    >
      <ServiceBoardCard
        service={service}
        dragHandle={
          <DragHandle
            label={`Mover ${service.name}`}
            attributes={attributes}
            listeners={listeners}
            setActivatorNodeRef={setActivatorNodeRef}
          />
        }
      />
    </div>
  );
}

type ServiceBoardCardProps = {
  service: Service;
  dragHandle?: ReactNode;
  isOverlay?: boolean;
};

function ServiceBoardCard({ service, dragHandle, isOverlay = false }: ServiceBoardCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl bg-card p-2 pr-3 text-sm text-card-foreground shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10',
        isOverlay && 'cursor-grabbing shadow-lg',
      )}
    >
      {dragHandle}
      <CatalogThumbnail imageUrl={service.coverImageUrl} name={service.name} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{service.name}</span>
          {!service.isActive && <Badge variant="secondary">Inativo</Badge>}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {formatMinutes(service.durationInMinutes)} · {formatCurrency(service.price)}
        </span>
      </div>
    </div>
  );
}
