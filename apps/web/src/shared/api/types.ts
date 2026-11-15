import type { ErrorCode } from './error-code';

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CursorPaginationMeta = {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export type ApiResponse<T> = {
  data: T;
  meta?: PaginationMeta | CursorPaginationMeta;
};

export type Paginated<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type CursorPaginated<T> = {
  data: T[];
  meta: CursorPaginationMeta;
};

export type ApiErrorDetail = {
  path: string;
  message: string;
};

export type ApiErrorResponse = {
  error: {
    statusCode: number;
    code?: ErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
};
