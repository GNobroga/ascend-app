import { applyDecorators, HttpStatus, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiProperty, ApiPropertyOptional, ApiResponse as SwaggerResponse, getSchemaPath } from '@nestjs/swagger';
import { ErrorCode } from '../errors/error-code.enum.js';

export class ApiErrorDetailDto {
  @ApiProperty({ example: 'email' })
  path: string;

  @ApiProperty({ example: 'email must be an email' })
  message: string;
}

export class ApiErrorBodyDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiPropertyOptional({ enum: Object.values(ErrorCode) })
  code?: ErrorCode;

  @ApiProperty({ example: 'Dados inválidos.' })
  message: string;

  @ApiPropertyOptional({ type: [ApiErrorDetailDto] })
  details?: ApiErrorDetailDto[];
}

export class ApiErrorResponseDto {
  @ApiProperty({ type: ApiErrorBodyDto })
  error: ApiErrorBodyDto;
}

interface ApiDataResponseOptions {
  status?: HttpStatus;
  description?: string;
  isArray?: boolean;
}

/** Resposta de sucesso no envelope `ApiResponse.of()`: `{ data: <model> }`. */
export const ApiDataResponse = (model: Type<unknown>, { status = HttpStatus.OK, description, isArray = false }: ApiDataResponseOptions = {}) => {
  const ref = { $ref: getSchemaPath(model) };
  return applyDecorators(
    ApiExtraModels(model),
    SwaggerResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: ['data'],
        properties: { data: isArray ? { type: 'array', items: ref } : ref },
      },
    }),
  );
};

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;

  @ApiProperty({ example: 57 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}


export const ApiPaginatedResponse = (model: Type<unknown>, { description }: { description?: string } = {}) =>
  applyDecorators(
    ApiExtraModels(model, PaginationMetaDto),
    SwaggerResponse({
      status: HttpStatus.OK,
      description,
      schema: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: getSchemaPath(model) } },
          meta: { $ref: getSchemaPath(PaginationMetaDto) },
        },
      },
    }),
  );

export class CursorPaginationMetaDto {
  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ type: String, nullable: true, description: 'Cursor da próxima página; `null` na última.', example: 'MjAyNi0xMC0yMFQxODowMDowMC4wMDBafDkwYmRhNjg1LWZkYjEtNGQ4Ni05Yjc2LTZlODNmOTA4NjcxMg' })
  nextCursor: string | null;

  @ApiProperty({ example: true })
  hasMore: boolean;
}

export const ApiCursorPaginatedResponse = (model: Type<unknown>, { description }: { description?: string } = {}) =>
  applyDecorators(
    ApiExtraModels(model, CursorPaginationMetaDto),
    SwaggerResponse({
      status: HttpStatus.OK,
      description,
      schema: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: getSchemaPath(model) } },
          meta: { $ref: getSchemaPath(CursorPaginationMetaDto) },
        },
      },
    }),
  );

/** Resposta de erro no formato do `GlobalExceptionFilter`. */
export const ApiErrorResponse = (status: HttpStatus, description: string) =>
  SwaggerResponse({ status, description, type: ApiErrorResponseDto });
