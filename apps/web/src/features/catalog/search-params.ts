import { parseAsString, parseAsStringLiteral } from 'nuqs';

export const STATUS_FILTERS = ['all', 'active', 'inactive'] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const UNCATEGORIZED_FILTER = 'none';

export const catalogFilterSearchParams = {
  q: parseAsString.withDefault(''),
  status: parseAsStringLiteral(STATUS_FILTERS).withDefault('all'),
};

export const serviceFilterSearchParams = {
  ...catalogFilterSearchParams,
  category: parseAsString,
};

export const isStatusFilter = (value: unknown): value is StatusFilter =>
  STATUS_FILTERS.some((status) => status === value);

export const CATALOG_VIEWS = ['list', 'grid', 'table'] as const;

export type CatalogView = (typeof CATALOG_VIEWS)[number];

export const catalogViewSearchParams = {
  view: parseAsStringLiteral(CATALOG_VIEWS).withDefault('grid'),
};

export const CATEGORY_VIEWS = ['list', 'board'] as const;

export type CategoryView = (typeof CATEGORY_VIEWS)[number];

export const categoryViewSearchParams = {
  view: parseAsStringLiteral(CATEGORY_VIEWS).withDefault('list'),
};
