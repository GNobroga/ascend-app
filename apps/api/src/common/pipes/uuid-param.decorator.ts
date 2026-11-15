import { HttpStatus, Param, ParseUUIDPipe } from '@nestjs/common';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-code.enum.js';

/** `@Param(name)` que exige UUID; senão responde 400 `VALIDATION_ERROR` no formato padrão da API. */
export const UuidParam = (name: string): ParameterDecorator =>
  Param(name, new ParseUUIDPipe({
    exceptionFactory: () => new AppException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'Dados inválidos.', [
      { path: name, message: `${name} must be a UUID` },
    ]),
  }));
