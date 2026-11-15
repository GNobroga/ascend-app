import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { StorageService } from '../../common/storage/storage.service.js';
import { nextDisplayOrder, reorderWithin } from '../../common/utilities/display-order.js';
import { ServiceImageEntity } from '../../database/entities/service-image.entity.js';
import type { CreateServiceImageDto, UpdateServiceImageDto } from './dto/service-image.dto.js';
import { ServicesService } from './services.service.js';

export const MAX_IMAGES_PER_SERVICE = 10;

@Injectable()
export class ServiceImagesService {

    constructor(
        @InjectRepository(ServiceImageEntity) private readonly images: Repository<ServiceImageEntity>,
        private readonly services: ServicesService,
        private readonly storage: StorageService,
    ) { }

    async list(businessId: string, serviceId: string): Promise<ServiceImageEntity[]> {
        await this.services.getById(businessId, serviceId);
        return this.images.find({ where: { service: { id: serviceId } }, order: { displayOrder: 'ASC', createdAt: 'ASC' } });
    }

    async upload(businessId: string, serviceId: string, file: Buffer, dto: CreateServiceImageDto): Promise<ServiceImageEntity> {
        await this.services.getById(businessId, serviceId);
        if (await this.images.countBy({ service: { id: serviceId } }) >= MAX_IMAGES_PER_SERVICE) {
            throw new AppException(ErrorCode.SERVICE_IMAGE_LIMIT_REACHED, HttpStatus.CONFLICT, `O serviço já tem ${MAX_IMAGES_PER_SERVICE} imagens.`);
        }

        return this.storage.storeImage(`businesses/${businessId}/services/${serviceId}`, file, async (storageKey) =>
            this.images.save(this.images.create({
                service: { id: serviceId },
                storageKey,
                altText: dto.altText ?? null,
                displayOrder: await nextDisplayOrder(this.images, { serviceId }),
            })));
    }

    async update(businessId: string, serviceId: string, id: string, dto: UpdateServiceImageDto): Promise<ServiceImageEntity> {
        const image = await this.getById(businessId, serviceId, id);
        this.images.merge(image, { altText: dto.altText });
        return this.images.save(image);
    }

    async remove(businessId: string, serviceId: string, id: string): Promise<void> {
        const image = await this.getById(businessId, serviceId, id);
        await this.images.delete({ id: image.id });
        await this.storage.delete(image.storageKey);
    }

    async reorder(businessId: string, serviceId: string, ids: string[]): Promise<void> {
        await this.services.getById(businessId, serviceId);
        await reorderWithin(this.images, { serviceId }, ids);
    }

    private async getById(businessId: string, serviceId: string, id: string): Promise<ServiceImageEntity> {
        const image = await this.images.findOneBy({ id, service: { id: serviceId, business: { id: businessId } } });
        if (!image) {
            throw new AppException(ErrorCode.SERVICE_IMAGE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Imagem não encontrada.');
        }
        return image;
    }
}
