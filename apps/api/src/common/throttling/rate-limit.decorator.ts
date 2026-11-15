import { applyDecorators, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiErrorResponse } from '../http/api-docs.js';

export const DEFAULT_RATE_LIMIT = { limit: 100, ttl: 60_000 };

export const RateLimit = (limit: number, ttlMs: number) => applyDecorators(
    Throttle({ default: { limit, ttl: ttlMs } }),
    ApiErrorResponse(HttpStatus.TOO_MANY_REQUESTS, 'Limite de requisições excedido (`TOO_MANY_REQUESTS`).'),
);
