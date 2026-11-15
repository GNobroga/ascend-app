import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AppException } from '../errors/app.exception.js';
import type { ApiErrorResponse } from '../http/api-response.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private static readonly DEFAULT_MESSAGE = 'Erro interno do servidor.';

  constructor(private readonly httpAdapterHost: HttpAdapterHost) { }

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const body = this.toBody(exception);

    httpAdapter.reply(ctx.getResponse(), body, body.error.statusCode);
  }

  private toBody(exception: unknown): ApiErrorResponse {
    if (exception instanceof AppException) {
      const { code, message, details } = exception;
      return { error: { statusCode: exception.getStatus(), code, message, ...(details && { details }) } };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      return { error: { statusCode, message: exception.message } };
    }

    return this.internalError(exception);
  }

  private internalError(exception: unknown): ApiErrorResponse {
    return { error: { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: GlobalExceptionFilter.DEFAULT_MESSAGE } };
  }
}
