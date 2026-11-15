import type { ErrorCode } from './error-code';
import type { ApiErrorDetail, ApiErrorResponse } from './types';

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode | undefined;
  readonly details: ApiErrorDetail[];

  constructor({ statusCode, code, message, details }: ApiErrorResponse['error']) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details ?? [];
  }

  static network() {
    return new ApiError({ statusCode: 0, message: 'Não foi possível conectar ao servidor.' });
  }

  static unexpected(statusCode: number) {
    return new ApiError({ statusCode, message: 'Ocorreu um erro inesperado. Tente novamente.' });
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

export const hasErrorCode = (error: unknown, code: ErrorCode): error is ApiError =>
  isApiError(error) && error.code === code;

export const isApiErrorResponse = (body: unknown): body is ApiErrorResponse =>
  typeof body === 'object' &&
  body !== null &&
  'error' in body &&
  typeof body.error === 'object' &&
  body.error !== null &&
  'message' in body.error;
