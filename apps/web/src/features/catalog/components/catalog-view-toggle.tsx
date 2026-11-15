import { LayoutGridIcon, ListIcon, TableIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { catalogViewSearchParams, type CatalogView } from '../search-params';
import { ViewToggle, type ViewOption } from './view-toggle';

const VIEW_OPTIONS: Array<ViewOption<CatalogView>> = [
  { value: 'grid', label: 'Vitrine', icon: LayoutGridIcon },
  { value: 'list', label: 'Lista', icon: ListIcon },
  { value: 'table', label: 'Tabela', icon: TableIcon },
];

export function CatalogViewToggle() {
  const [{ view }, setSearchParams] = useQueryStates(catalogViewSearchParams);

  return (
    <ViewToggle
      options={VIEW_OPTIONS}
      value={view}
      onValueChange={(value) => void setSearchParams({ view: value === 'grid' ? null : value })}
    />
  );
}
