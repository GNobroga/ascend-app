import { HttpStatus } from '@nestjs/common';
import sharp from 'sharp';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-code.enum.js';

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 80;

export interface OptimizedImage {
    buffer: Buffer;
    contentType: 'image/webp';
    extension: 'webp';
}

/** Valida, aplica a orientação do EXIF, limita a {@link MAX_DIMENSION}px e converte para WebP sem metadados (sem GPS). */
export const optimizeImage = async (input: Buffer): Promise<OptimizedImage> => {
    try {
        const buffer = await sharp(input, { failOn: 'error', limitInputPixels: 50_000_000 })
            .rotate()
            .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: WEBP_QUALITY })
            .toBuffer();
        return { buffer, contentType: 'image/webp', extension: 'webp' };
    } catch {
        throw new AppException(ErrorCode.INVALID_IMAGE, HttpStatus.BAD_REQUEST, 'Arquivo de imagem inválido.');
    }
};
