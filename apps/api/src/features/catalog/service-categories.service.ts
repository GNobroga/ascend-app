import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { ServiceCategoryEntity } from '../../database/entities/service-category.entity.js';
import { ServiceEntity } from '../../database/entities/service.entity.js';
import type { ServiceCategoryListQueryDto } from './dto/catalog-list-query.dto.js';
import type { CreateServiceCategoryDto, UpdateServiceCategoryDto } from './dto/service-category.dto.js';
import { nextDisplayOrder, reorderWithin } from '../../common/utilities/display-order.js';

@Injectable()
export class ServiceCategoriesService {

    constructor(@InjectRepository(ServiceCategoryEntity) private readonly categories: Repository<ServiceCategoryEntity>) { }

    list(businessId: string, query: ServiceCategoryListQueryDto = {}): Promise<ServiceCategoryEntity[]> {
        return this.categories.find({
            where: {
                business: { id: businessId },
                ...(query.isActive !== undefined && { isActive: query.isActive }),
            },
            order: { displayOrder: 'ASC', name: 'ASC' },
        });
    }

    async getById(businessId: string, id: string): Promise<ServiceCategoryEntity> {
        const category = await this.categories.findOneBy({ id, business: { id: businessId } });
        if (!category) {
            throw new AppException(ErrorCode.SERVICE_CATEGORY_NOT_FOUND, HttpStatus.NOT_FOUND, 'Categoria não encontrada.');
        }
        return category;
    }

    async create(businessId: string, dto: CreateServiceCategoryDto): Promise<ServiceCategoryEntity> {
        return this.categories.save(this.categories.create({
            business: { id: businessId },
            name: dto.name.trim(),
            description: dto.description ?? null,
            displayOrder: dto.displayOrder ?? await nextDisplayOrder(this.categories, { businessId }),
            isActive: dto.isActive,
        }));
    }

    async update(businessId: string, id: string, dto: UpdateServiceCategoryDto): Promise<ServiceCategoryEntity> {
        const category = await this.getById(businessId, id);
        this.categories.merge(category, {
            name: dto.name?.trim(),
            description: dto.description,
            displayOrder: dto.displayOrder,
            isActive: dto.isActive,
        });
        return this.categories.save(category);
    }

    async remove(businessId: string, id: string): Promise<void> {
        const category = await this.getById(businessId, id);
        await this.categories.manager.transaction(async (manager) => {
            await manager.update(ServiceEntity, { category: { id: category.id } }, { category: null });
            await manager.softDelete(ServiceCategoryEntity, { id: category.id });
        });
    }

    reorder(businessId: string, ids: string[]): Promise<void> {
        return reorderWithin(this.categories, { businessId }, ids);
    }
}
