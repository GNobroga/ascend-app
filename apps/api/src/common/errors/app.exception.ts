import { HttpException, HttpStatus } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { ErrorCode } from './error-code.enum.js';

/** Detalhe de um erro, apontando o campo (`path`) quando houver. */
export interface ErrorDetail {
  path: string;
  message: string;
}

const toDetails = (errors: ValidationError[], parentPath = ''): ErrorDetail[] =>
  errors.flatMap((error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({ path, message }));
    return [...own, ...toDetails(error.children ?? [], path)];
  });

export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    status: HttpStatus,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message, status);
  }

  static fromValidationErrors(errors: ValidationError[]): AppException {
    return new AppException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'Dados inválidos.', toDetails(errors));
  }
}
