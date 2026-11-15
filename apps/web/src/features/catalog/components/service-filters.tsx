import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@packages/ui/components/select';
import { useQueryStates } from 'nuqs';
import { UNCATEGORIZED_LABEL } from '../filters';
import { serviceFilterSearchParams, UNCATEGORIZED_FILTER } from '../search-params';
import type { ServiceCategory } from '../types';
import { CatalogFilters } from './catalog-filters';

const ALL_CATEGORIES = 'all';

type ServiceFiltersProps = {
  categories: ServiceCategory[];
};

export function ServiceFilters({ categories }: ServiceFiltersProps) {
  const [{ category }, setFilters] = useQueryStates(serviceFilterSearchParams);

  const categoryOptions = [
    { value: ALL_CATEGORIES, label: 'Todas as categorias' },
    ...categories.map(({ id, name }) => ({ value: id, label: name })),
    { value: UNCATEGORIZED_FILTER, label: UNCATEGORIZED_LABEL },
  ];

  return (
    <CatalogFilters searchLabel="Buscar serviço" activeLabel="Ativos" inactiveLabel="Inativos">
      <Select
        items={categoryOptions}
        value={category ?? ALL_CATEGORIES}
        onValueChange={(value) => {
          if (typeof value === 'string') void setFilters({ category: value === ALL_CATEGORIES ? null : value });
        }}
      >
        <SelectTrigger aria-label="Filtrar por categoria" className="w-full sm:w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {categoryOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </CatalogFilters>
  );
}
