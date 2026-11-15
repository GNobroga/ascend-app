import { normalizeText } from '@/shared/lib/normalize-text';
import type { StatusFilter } from './search-params';

export const UNCATEGORIZED_LABEL = 'Sem categoria';

type CatalogFilters = {
  q: string;
  status: StatusFilter;
};

type FilterableItem = {
  isActive: boolean;
  searchableTexts: string[];
};

export const matchesCatalogFilters = ({ isActive, searchableTexts }: FilterableItem, { q, status }: CatalogFilters) => {
  const search = normalizeText(q);
  return (
    (status === 'all' || isActive === (status === 'active')) &&
    (search === '' || searchableTexts.some((text) => normalizeText(text).includes(search)))
  );
};
