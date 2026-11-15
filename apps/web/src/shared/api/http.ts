import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/shared/env';
import { ApiError, hasErrorCode, isApiErrorResponse } from './api-error';
import { ErrorCode } from './error-code';

type RetriableRequestConfig = InternalAxiosRequestConfig & { retried?: boolean };

const REFRESH_URL = '/auth/refresh';

export const http = axios.create({
  baseURL: env.VITE_API_URL,
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;
let sessionExpiredHandler: (() => void) | null = null;

export const setSessionExpiredHandler = (handler: () => void) => {
  sessionExpiredHandler = handler;
};

const refreshSession = () => {
  refreshPromise ??= http
    .post<void>(REFRESH_URL)
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

const toApiError = (error: AxiosError) => {
  if (!error.response) return ApiError.network();

  const body = error.response.data;
  return isApiErrorResponse(body) ? new ApiError(body.error) : ApiError.unexpected(error.response.status);
};

const isUnwrappable = (body: unknown): body is { data: unknown; meta?: unknown } =>
  typeof body === 'object' && body !== null && 'data' in body;

http.interceptors.response.use(
  (response) => {
    const body: unknown = response.data;
    if (isUnwrappable(body)) {
      response.data = body.meta === undefined ? body.data : body;
    }
    return response;
  },
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || axios.isCancel(error)) throw error;

    const apiError = toApiError(error);
    const config = error.config as RetriableRequestConfig | undefined;

    const shouldRefresh =
      config &&
      !config.retried &&
      config.url !== REFRESH_URL &&
      hasErrorCode(apiError, ErrorCode.UNAUTHENTICATED);

    if (!shouldRefresh) throw apiError;

    try {
      await refreshSession();
    } catch {
      sessionExpiredHandler?.();
      throw apiError;
    }

    config.retried = true;
    return http(config);
  },
);

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => http.get<T>(url, config).then(({ data }) => data),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    http.post<T>(url, body, config).then(({ data }) => data),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    http.put<T>(url, body, config).then(({ data }) => data),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    http.patch<T>(url, body, config).then(({ data }) => data),
  delete: <T = void>(url: string, config?: AxiosRequestConfig) => http.delete<T>(url, config).then(({ data }) => data),
};
