import type { ErrorDetail } from '../errors/app.exception.js';
import type { ErrorCode } from '../errors/error-code.enum.js';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CursorPaginationMeta {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export class ApiResponse<T> {
  private constructor(
    readonly data: T,
    readonly meta?: PaginationMeta | CursorPaginationMeta,
  ) {}

  static of<T>(data: T): ApiResponse<T> {
    return new ApiResponse(data);
  }

  static paginated<T>(items: T[], total: number, query: { page: number; pageSize: number }): ApiResponse<T[]> {
    return new ApiResponse(items, {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    });
  }

  static cursorPaginated<T>(rows: T[], query: { limit: number }, toCursor: (last: T) => string): ApiResponse<T[]> {
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;

    return new ApiResponse(items, {
      limit: query.limit,
      nextCursor: hasMore ? toCursor(items[items.length - 1]) : null,
      hasMore,
    });
  }
}

export interface ApiErrorResponse {
  error: {
    statusCode: number;
    code?: ErrorCode;
    message: string;
    details?: ErrorDetail[];
  };
}
