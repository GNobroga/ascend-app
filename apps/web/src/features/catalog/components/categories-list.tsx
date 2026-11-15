import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@packages/ui/components/dropdown-menu';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@packages/ui/components/empty';
import { toast } from '@packages/ui/components/sonner';
import { cn } from '@packages/ui/lib/utils';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  EllipsisIcon,
  EyeIcon,
  EyeOffIcon,
  FolderIcon,
  KanbanIcon,
  ListIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useState, type ReactNode } from 'react';
import { useReorderCategories, useUpdateCategory } from '../api/catalog.mutations';
import { catalogQueries } from '../api/catalog.queries';
import { createAnnouncements, screenReaderInstructions, useSortableSensors } from '../drag-and-drop';
import { matchesCatalogFilters, UNCATEGORIZED_LABEL } from '../filters';
import {
  catalogFilterSearchParams,
  categoryViewSearchParams,
  UNCATEGORIZED_FILTER,
  type CategoryView,
} from '../search-params';
import type { ServiceCategory } from '../types';
import { useCanManageCatalog } from '../use-can-manage-catalog';
import { CatalogFilters } from './catalog-filters';
import { CategoryFormDialog } from './category-form-dialog';
import { DeleteCategoryDialog } from './delete-category-dialog';
import { DragHandle } from './drag-handle';
import { NoResults } from './no-results';
import { ServicesBoard } from './services-board';
import { ViewToggle, type ViewOption } from './view-toggle';

type CategoryActions = {
  onEdit: (category: ServiceCategory) => void;
  onToggleActive: (category: ServiceCategory) => void;
  onDelete: (category: ServiceCategory) => void;
};

const VIEW_OPTIONS: Array<ViewOption<CategoryView>> = [
  { value: 'list', label: 'Lista', icon: ListIcon },
  { value: 'board', label: 'Quadro', icon: KanbanIcon },
];

const ROW_CLASS = 'flex items-center gap-4 py-3 first:pt-0 last:pb-0';

const serviceCountLabel = (count: number) => (count === 1 ? '1 serviço' : `${count} serviços`);

type CategoriesListProps = {
  businessId: string;
};

export function CategoriesList({ businessId }: CategoriesListProps) {
  const { data: savedCategories } = useSuspenseQuery(catalogQueries.categories(businessId));
  const { data: services } = useSuspenseQuery(catalogQueries.services(businessId));
  const [draftOrder, setDraftOrder] = useState<ServiceCategory[] | null>(null);
  const categories = draftOrder ?? savedCategories;
  const [{ view }, setSearchParams] = useQueryStates(categoryViewSearchParams);
  const [{ q, status }, setFilters] = useQueryStates(catalogFilterSearchParams);
  const canManage = useCanManageCatalog(businessId);
  const sensors = useSortableSensors();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | undefined>();
  const [deletingCategory, setDeletingCategory] = useState<ServiceCategory | null>(null);
  const updateCategory = useUpdateCategory(businessId);
  const reorderCategories = useReorderCategories(businessId);

  const countServices = (categoryId: string) => services.filter((service) => service.categoryId === categoryId).length;

  const filteredCategories = categories.filter((category) =>
    matchesCatalogFilters({ isActive: category.isActive, searchableTexts: [category.name] }, { q, status }),
  );
  const showUncategorized = matchesCatalogFilters(
    { isActive: true, searchableTexts: [UNCATEGORIZED_LABEL] },
    { q, status },
  );
  const visibleColumnIds = new Set([
    ...filteredCategories.map((category) => category.id),
    ...(showUncategorized ? [UNCATEGORIZED_FILTER] : []),
  ]);
  const hasResults = view === 'board' ? visibleColumnIds.size > 0 : filteredCategories.length > 0;

  const nameOf = (id: string | number) => categories.find((category) => category.id === id)?.name ?? '';

  const openCreate = () => {
    setEditingCategory(undefined);
    setIsFormOpen(true);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const from = categories.findIndex((category) => category.id === active.id);
    const to = categories.findIndex((category) => category.id === over.id);
    if (from === -1 || to === -1) return;

    const reordered = arrayMove(categories, from, to);
    setDraftOrder(reordered);
    reorderCategories.mutate(reordered, { onSettled: () => setDraftOrder(null) });
  };

  const actions: CategoryActions | null = canManage
    ? {
        onEdit: (category) => {
          setEditingCategory(category);
          setIsFormOpen(true);
        },
        onToggleActive: (category) => {
          updateCategory.mutate(
            { categoryId: category.id, body: { isActive: !category.isActive } },
            {
              onSuccess: (updated) => toast.success(updated.isActive ? 'Categoria ativada.' : 'Categoria inativada.'),
            },
          );
        },
        onDelete: setDeletingCategory,
      }
    : null;

  const newCategoryButton = canManage && (
    <Button type="button" onClick={openCreate}>
      <PlusIcon />
      Nova categoria
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      {categories.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhuma categoria</EmptyTitle>
            <EmptyDescription>
              Agrupe serviços parecidos, como “Cabelo” ou “Barba”, para facilitar a escolha do cliente.
            </EmptyDescription>
          </EmptyHeader>
          {newCategoryButton && <EmptyContent>{newCategoryButton}</EmptyContent>}
        </Empty>
      ) : (
        <>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <CatalogFilters searchLabel="Buscar categoria" activeLabel="Ativas" inactiveLabel="Inativas" />
            <div className="flex items-center gap-2">
              <ViewToggle
                options={VIEW_OPTIONS}
                value={view}
                onValueChange={(value) => void setSearchParams({ view: value === 'list' ? null : value })}
              />
              {newCategoryButton}
            </div>
          </div>

          {hasResults && canManage && (
            <p className="text-sm text-muted-foreground">
              {view === 'board'
                ? 'Arraste os serviços entre as colunas para mudar a categoria ou a ordem deles.'
                : 'Arraste as categorias para definir a ordem em que aparecem no catálogo.'}
            </p>
          )}

          {!hasResults && (
            <NoResults
              title="Nenhuma categoria encontrada"
              onClearFilters={() => void setFilters({ q: null, status: null })}
            />
          )}

          {hasResults && view === 'board' && (
            <ServicesBoard businessId={businessId} canManage={canManage} visibleColumnIds={visibleColumnIds} />
          )}

          {hasResults && view === 'list' && (
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
                    <SortableContext items={filteredCategories} strategy={verticalListSortingStrategy}>
                      <ul className="flex flex-col divide-y">
                        {filteredCategories.map((category) => (
                          <SortableCategoryRow
                            key={category.id}
                            category={category}
                            disabled={reorderCategories.isPending}
                          >
                            {(dragHandle) => (
                              <CategoryRowContent
                                category={category}
                                serviceCount={countServices(category.id)}
                                actions={actions}
                                dragHandle={dragHandle}
                              />
                            )}
                          </SortableCategoryRow>
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <ul className="flex flex-col divide-y">
                    {filteredCategories.map((category) => (
                      <li key={category.id} className={ROW_CLASS}>
                        <CategoryRowContent
                          category={category}
                          serviceCount={countServices(category.id)}
                          actions={null}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {canManage && (
        <>
          <CategoryFormDialog
            businessId={businessId}
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            category={editingCategory}
          />
          <DeleteCategoryDialog
            businessId={businessId}
            category={deletingCategory}
            serviceCount={deletingCategory ? countServices(deletingCategory.id) : 0}
            onOpenChange={(open) => {
              if (!open) setDeletingCategory(null);
            }}
          />
        </>
      )}
    </div>
  );
}

type SortableCategoryRowProps = {
  category: ServiceCategory;
  disabled: boolean;
  children: (dragHandle: ReactNode) => ReactNode;
};

function SortableCategoryRow({ category, disabled, children }: SortableCategoryRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled,
    attributes: { roleDescription: 'categoria ordenável' },
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(ROW_CLASS, 'bg-card', isDragging && 'relative z-10 opacity-80')}
    >
      {children(
        <DragHandle
          label={`Mover ${category.name}`}
          attributes={attributes}
          listeners={listeners}
          setActivatorNodeRef={setActivatorNodeRef}
        />,
      )}
    </li>
  );
}

type CategoryRowContentProps = {
  category: ServiceCategory;
  serviceCount: number;
  actions: CategoryActions | null;
  dragHandle?: ReactNode;
};

function CategoryRowContent({ category, serviceCount, actions, dragHandle }: CategoryRowContentProps) {
  return (
    <>
      {dragHandle && <div className="-ml-2">{dragHandle}</div>}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 font-medium">
          {actions ? (
            <button
              type="button"
              className="truncate rounded-sm text-left outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
              onClick={() => actions.onEdit(category)}
            >
              {category.name}
            </button>
          ) : (
            <span className="truncate">{category.name}</span>
          )}
          {!category.isActive && <Badge variant="secondary">Inativa</Badge>}
        </span>
        {category.description && (
          <span className="line-clamp-1 text-sm text-muted-foreground">{category.description}</span>
        )}
      </div>

      <span className="shrink-0 text-sm text-muted-foreground">{serviceCountLabel(serviceCount)}</span>

      {actions && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Ações de ${category.name}`} />
            }
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onClick={() => actions.onEdit(category)}>
              <PencilIcon />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onToggleActive(category)}>
              {category.isActive ? <EyeOffIcon /> : <EyeIcon />}
              {category.isActive ? 'Inativar' : 'Ativar'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => actions.onDelete(category)}>
              <Trash2Icon />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}
