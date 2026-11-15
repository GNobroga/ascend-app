import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { StorageService } from '../../common/storage/storage.service.js';
import { nextDisplayOrder, reorderWithin } from '../../common/utilities/display-order.js';
import { PackageImageEntity } from '../../database/entities/package-image.entity.js';
import type { CreatePackageImageDto, UpdatePackageImageDto } from './dto/package-image.dto.js';
import { PackagesService } from './packages.service.js';

export const MAX_IMAGES_PER_PACKAGE = 10;

@Injectable()
export class PackageImagesService {

    constructor(
        @InjectRepository(PackageImageEntity) private readonly images: Repository<PackageImageEntity>,
        private readonly packages: PackagesService,
        private readonly storage: StorageService,
    ) { }

    async list(businessId: string, packageId: string): Promise<PackageImageEntity[]> {
        await this.packages.getById(businessId, packageId);
        return this.images.find({ where: { package: { id: packageId } }, order: { displayOrder: 'ASC', createdAt: 'ASC' } });
    }

    async upload(businessId: string, packageId: string, file: Buffer, dto: CreatePackageImageDto): Promise<PackageImageEntity> {
        await this.packages.getById(businessId, packageId);
        if (await this.images.countBy({ package: { id: packageId } }) >= MAX_IMAGES_PER_PACKAGE) {
            throw new AppException(ErrorCode.PACKAGE_IMAGE_LIMIT_REACHED, HttpStatus.CONFLICT, `O pacote já tem ${MAX_IMAGES_PER_PACKAGE} imagens.`);
        }

        return this.storage.storeImage(`businesses/${businessId}/packages/${packageId}`, file, async (storageKey) =>
            this.images.save(this.images.create({
                package: { id: packageId },
                storageKey,
                altText: dto.altText ?? null,
                displayOrder: await nextDisplayOrder(this.images, { packageId }),
            })));
    }

    async update(businessId: string, packageId: string, id: string, dto: UpdatePackageImageDto): Promise<PackageImageEntity> {
        const image = await this.getById(businessId, packageId, id);
        this.images.merge(image, { altText: dto.altText });
        return this.images.save(image);
    }

    async remove(businessId: string, packageId: string, id: string): Promise<void> {
        const image = await this.getById(businessId, packageId, id);
        await this.images.delete({ id: image.id });
        await this.storage.delete(image.storageKey);
    }

    async reorder(businessId: string, packageId: string, ids: string[]): Promise<void> {
        await this.packages.getById(businessId, packageId);
        await reorderWithin(this.images, { packageId }, ids);
    }

    private async getById(businessId: string, packageId: string, id: string): Promise<PackageImageEntity> {
        const image = await this.images.findOneBy({ id, package: { id: packageId, business: { id: businessId } } });
        if (!image) {
            throw new AppException(ErrorCode.PACKAGE_IMAGE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Imagem não encontrada.');
        }
        return image;
    }
}
