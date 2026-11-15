import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { ServiceEntity } from '../../database/entities/service.entity.js';
import type { ServiceListQueryDto } from './dto/catalog-list-query.dto.js';
import type { CreateServiceDto, UpdateServiceDto } from './dto/service.dto.js';
import { nextDisplayOrder, reorderWithin } from '../../common/utilities/display-order.js';
import { ServiceCategoriesService } from './service-categories.service.js';

@Injectable()
export class ServicesService {

    constructor(
        @InjectRepository(ServiceEntity) private readonly services: Repository<ServiceEntity>,
        private readonly categories: ServiceCategoriesService,
    ) { }

    list(businessId: string, query: ServiceListQueryDto = {}, { withImages = false } = {}): Promise<ServiceEntity[]> {
        return this.services.find({
            where: {
                business: { id: businessId },
                ...(query.isActive !== undefined && { isActive: query.isActive }),
                ...(query.categoryId && { category: { id: query.categoryId } }),
            },
            relations: { category: true, images: withImages },
            order: { displayOrder: 'ASC', name: 'ASC', ...(withImages && { images: { displayOrder: 'ASC' } }) },
        });
    }

    hasActive(businessId: string): Promise<boolean> {
        return this.services.existsBy({ business: { id: businessId }, isActive: true });
    }

    async getById(businessId: string, id: string): Promise<ServiceEntity> {
        const service = await this.services.findOne({
            where: { id, business: { id: businessId } },
            relations: { category: true, images: true },
            order: { images: { displayOrder: 'ASC' } },
        });
        if (!service) {
            throw ServicesService.notFound();
        }
        return service;
    }

    async getMany(businessId: string, ids: string[], { activeOnly = false } = {}): Promise<ServiceEntity[]> {
        const services = await this.services.findBy({ id: In(ids), business: { id: businessId }, ...(activeOnly && { isActive: true }) });
        if (services.length !== new Set(ids).size) {
            throw ServicesService.notFound();
        }
        return services;
    }

    async create(businessId: string, dto: CreateServiceDto): Promise<ServiceEntity> {
        const category = dto.categoryId ? await this.categories.getById(businessId, dto.categoryId) : null;

        const service = await this.services.save(this.services.create({
            business: { id: businessId },
            category,
            name: dto.name.trim(),
            description: dto.description ?? null,
            durationInMinutes: dto.durationInMinutes,
            price: dto.price,
            displayOrder: dto.displayOrder ?? await nextDisplayOrder(this.services, { businessId }),
            isActive: dto.isActive,
        }));
        return this.getById(businessId, service.id);
    }

    async update(businessId: string, id: string, dto: UpdateServiceDto): Promise<ServiceEntity> {
        const service = await this.getById(businessId, id);

        if (dto.categoryId !== undefined) {
            service.category = dto.categoryId ? await this.categories.getById(businessId, dto.categoryId) : null;
        }
        this.services.merge(service, {
            name: dto.name?.trim(),
            description: dto.description,
            durationInMinutes: dto.durationInMinutes,
            price: dto.price,
            displayOrder: dto.displayOrder,
            isActive: dto.isActive,
        });

        await this.services.save(service);
        return this.getById(businessId, id);
    }

    async remove(businessId: string, id: string): Promise<void> {
        const service = await this.getById(businessId, id);
        await this.services.softDelete({ id: service.id });
    }

    reorder(businessId: string, ids: string[]): Promise<void> {
        return reorderWithin(this.services, { businessId }, ids);
    }

    private static notFound(): AppException {
        return new AppException(ErrorCode.SERVICE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Serviço não encontrado.');
    }
}
