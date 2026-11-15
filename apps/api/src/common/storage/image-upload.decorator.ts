import {
    applyDecorators,
    HttpStatus,
    Injectable,
    ParseFilePipe,
    PayloadTooLargeException,
    UploadedFile,
    UseInterceptors,
    type CallHandler,
    type NestInterceptor,
    type Type,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiProperty } from '@nestjs/swagger';
import { catchError, throwError } from 'rxjs';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-code.enum.js';
import { ApiErrorResponse } from '../http/api-docs.js';

const IMAGE_FIELD = 'file';
const MAX_IMAGE_UPLOAD_MB = 5;

export class ImageUploadDto {
    @ApiProperty({ type: 'string', format: 'binary', description: `JPEG, PNG, WebP, AVIF ou GIF de até ${MAX_IMAGE_UPLOAD_MB} MB; é convertida para WebP.` })
    file: unknown;
}

@Injectable()
class ImageTooLargeInterceptor implements NestInterceptor {
    intercept(_: unknown, next: CallHandler) {
        return next.handle().pipe(catchError((error: unknown) => throwError(() => error instanceof PayloadTooLargeException
            ? new AppException(ErrorCode.IMAGE_TOO_LARGE, HttpStatus.PAYLOAD_TOO_LARGE, `A imagem deve ter até ${MAX_IMAGE_UPLOAD_MB} MB.`)
            : error)));
    }
}

export const ImageUpload = (body: Type<ImageUploadDto> = ImageUploadDto) => applyDecorators(
    UseInterceptors(
        ImageTooLargeInterceptor,
        FileInterceptor(IMAGE_FIELD, { limits: { fileSize: MAX_IMAGE_UPLOAD_MB * 1024 * 1024, files: 1 } }),
    ),
    ApiConsumes('multipart/form-data'),
    ApiBody({ type: body }),
    ApiErrorResponse(HttpStatus.PAYLOAD_TOO_LARGE, `Imagem maior que ${MAX_IMAGE_UPLOAD_MB} MB (\`IMAGE_TOO_LARGE\`).`),
);


export const UploadedImage = (): ParameterDecorator => UploadedFile(
    new ParseFilePipe({
        exceptionFactory: () => new AppException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'Dados inválidos.', [
            { path: IMAGE_FIELD, message: `${IMAGE_FIELD} is required` },
        ]),
    }),
    { transform: (file: { buffer: Buffer }) => file.buffer },
);
