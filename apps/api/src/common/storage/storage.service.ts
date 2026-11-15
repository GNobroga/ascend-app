import { randomUUID } from 'node:crypto';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { env } from '../../config/env.config.js';
import { optimizeImage } from './image-optimizer.js';

@Injectable()
export class StorageService implements OnModuleDestroy {

    private readonly logger = new Logger(StorageService.name);

    private readonly client = new S3Client({
        endpoint: env.STORAGE_ENDPOINT,
        region: env.STORAGE_REGION,
        forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
        credentials: { accessKeyId: env.STORAGE_ACCESS_KEY, secretAccessKey: env.STORAGE_SECRET_KEY },
    });


    async storeImage<T>(folder: string, file: Buffer, persist: (key: string) => Promise<T>): Promise<T> {
        const key = await this.uploadImage(folder, file);
        try {
            return await persist(key);
        } catch (error) {
            await this.delete(key);
            throw error;
        }
    }

    async replaceImage(folder: string, file: Buffer, previousKey: string | null, persist: (key: string) => Promise<void>): Promise<string> {
        const key = await this.storeImage(folder, file, async (newKey) => {
            await persist(newKey);
            return newKey;
        });
        if (previousKey) {
            await this.delete(previousKey);
        }
        return key;
    }

    private async uploadImage(folder: string, file: Buffer): Promise<string> {
        const image = await optimizeImage(file);
        const key = `${folder}/${randomUUID()}.${image.extension}`;
        await this.client.send(new PutObjectCommand({
            Bucket: env.STORAGE_BUCKET,
            Key: key,
            Body: image.buffer,
            ContentType: image.contentType,
            CacheControl: 'public, max-age=31536000, immutable',
        }));
        return key;
    }

    async delete(key: string): Promise<void> {
        try {
            await this.client.send(new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }));
        } catch (error) {
            this.logger.error(`Falha ao remover ${key} do storage.`, error instanceof Error ? error.stack : error);
        }
    }

    onModuleDestroy(): void {
        this.client.destroy();
    }
}
