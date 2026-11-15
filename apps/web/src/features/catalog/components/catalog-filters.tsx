import { InputGroup, InputGroupAddon, InputGroupInput } from '@packages/ui/components/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@packages/ui/components/select';
import { SearchIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import type { ReactNode } from 'react';
import { catalogFilterSearchParams, isStatusFilter, type StatusFilter } from '../search-params';

type StatusOption = {
  value: StatusFilter;
  label: string;
};

type CatalogFiltersProps = {
  searchLabel: string;
  activeLabel: string;
  inactiveLabel: string;
  children?: ReactNode;
};

export function CatalogFilters({ searchLabel, activeLabel, inactiveLabel, children }: CatalogFiltersProps) {
  const [{ q, status }, setFilters] = useQueryStates(catalogFilterSearchParams);

  const statusOptions: StatusOption[] = [
    { value: 'all', label: 'Todos os status' },
    { value: 'active', label: activeLabel },
    { value: 'inactive', label: inactiveLabel },
  ];

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <InputGroup className="sm:max-w-xs">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          placeholder={searchLabel}
          aria-label={searchLabel}
          value={q}
          onChange={(event) => void setFilters({ q: event.target.value || null })}
        />
      </InputGroup>

      {children}

      <Select
        items={statusOptions}
        value={status}
        onValueChange={(value) => {
          if (isStatusFilter(value)) void setFilters({ status: value === 'all' ? null : value });
        }}
      >
        <SelectTrigger aria-label="Filtrar por status" className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
