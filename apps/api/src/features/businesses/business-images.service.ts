import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessImageType } from '../../common/enums/business-image-type.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { StorageService } from '../../common/storage/storage.service.js';
import { nextDisplayOrder, reorderWithin } from '../../common/utilities/display-order.js';
import { BusinessImageEntity } from '../../database/entities/business-image.entity.js';
import type { CreateBusinessImageDto, UpdateBusinessImageDto } from './dto/business-image.dto.js';

export const MAX_IMAGES_PER_BUSINESS = 20;

@Injectable()
export class BusinessImagesService {

    constructor(
        @InjectRepository(BusinessImageEntity) private readonly images: Repository<BusinessImageEntity>,
        private readonly storage: StorageService,
    ) { }

    list(businessId: string): Promise<BusinessImageEntity[]> {
        return this.images.find({ where: { business: { id: businessId } }, order: { displayOrder: 'ASC', createdAt: 'ASC' } });
    }

    async getById(businessId: string, id: string): Promise<BusinessImageEntity> {
        const image = await this.images.findOneBy({ id, business: { id: businessId } });
        if (!image) {
            throw new AppException(ErrorCode.BUSINESS_IMAGE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Imagem não encontrada.');
        }
        return image;
    }

    async upload(businessId: string, file: Buffer, dto: CreateBusinessImageDto): Promise<BusinessImageEntity> {
        if (await this.images.countBy({ business: { id: businessId } }) >= MAX_IMAGES_PER_BUSINESS) {
            throw new AppException(ErrorCode.BUSINESS_IMAGE_LIMIT_REACHED, HttpStatus.CONFLICT, `O negócio já tem ${MAX_IMAGES_PER_BUSINESS} imagens.`);
        }

        return this.storage.storeImage(`businesses/${businessId}/images`, file, (storageKey) =>
            this.images.manager.transaction(async (manager) => {
                const repo = manager.getRepository(BusinessImageEntity);
                if (dto.type === BusinessImageType.COVER) {
                    await BusinessImagesService.demoteCover(repo, businessId);
                }
                return repo.save(repo.create({
                    business: { id: businessId },
                    storageKey,
                    type: dto.type,
                    altText: dto.altText ?? null,
                    displayOrder: await nextDisplayOrder(repo, { businessId }),
                }));
            }));
    }

    async update(businessId: string, id: string, dto: UpdateBusinessImageDto): Promise<BusinessImageEntity> {
        const image = await this.getById(businessId, id);
        return this.images.manager.transaction(async (manager) => {
            const repo = manager.getRepository(BusinessImageEntity);
            if (dto.type === BusinessImageType.COVER && image.type !== BusinessImageType.COVER) {
                await BusinessImagesService.demoteCover(repo, businessId);
            }
            repo.merge(image, { type: dto.type, altText: dto.altText });
            return repo.save(image);
        });
    }

    async remove(businessId: string, id: string): Promise<void> {
        const image = await this.getById(businessId, id);
        await this.images.delete({ id: image.id });
        await this.storage.delete(image.storageKey);
    }

    reorder(businessId: string, ids: string[]): Promise<void> {
        return reorderWithin(this.images, { businessId }, ids);
    }

    private static demoteCover(repo: Repository<BusinessImageEntity>, businessId: string) {
        return repo.update({ business: { id: businessId }, type: BusinessImageType.COVER }, { type: BusinessImageType.GALLERY });
    }
}
