import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { nextDisplayOrder, reorderWithin } from '../../common/utilities/display-order.js';
import { PackageServiceEntity } from '../../database/entities/package-service.entity.js';
import { PackageEntity } from '../../database/entities/package.entity.js';
import type { CreatePackageDto, PackageListQueryDto, UpdatePackageDto } from './dto/package.dto.js';
import { ServicesService } from './services.service.js';

const PACKAGE_RELATIONS = { services: { service: true }, professionals: { professional: true }, images: true } as const;
const PACKAGE_ORDER = { services: { service: { displayOrder: 'ASC', name: 'ASC' } }, professionals: { professional: { displayName: 'ASC' } }, images: { displayOrder: 'ASC' } } as const;

@Injectable()
export class PackagesService {

    constructor(
        @InjectRepository(PackageEntity) private readonly packages: Repository<PackageEntity>,
        private readonly services: ServicesService,
    ) { }

    list(businessId: string, query: PackageListQueryDto = {}): Promise<PackageEntity[]> {
        return this.packages.find({
            where: { business: { id: businessId }, ...(query.isActive !== undefined && { isActive: query.isActive }) },
            relations: PACKAGE_RELATIONS,
            order: { displayOrder: 'ASC', name: 'ASC', ...PACKAGE_ORDER },
        });
    }

    async listBookableOnline(businessId: string): Promise<PackageEntity[]> {
        const packages = await this.packages.find({
            where: { business: { id: businessId }, isActive: true },
            relations: { services: { service: true }, images: true },
            order: { displayOrder: 'ASC', name: 'ASC', services: PACKAGE_ORDER.services, images: { displayOrder: 'ASC' } },
        });
        return packages.filter((pkg) => PackagesService.isBookableOnline(pkg));
    }

    async getById(businessId: string, id: string): Promise<PackageEntity> {
        const pkg = await this.packages.findOne({
            where: { id, business: { id: businessId } },
            relations: PACKAGE_RELATIONS,
            order: PACKAGE_ORDER,
        });
        if (!pkg) {
            throw PackagesService.notFound();
        }
        return pkg;
    }

    async getForBooking(businessId: string, id: string, { online }: { online: boolean }): Promise<PackageEntity> {
        const pkg = await this.packages.findOne({
            where: { id, business: { id: businessId } },
            relations: { services: { service: true } },
            order: { services: PACKAGE_ORDER.services },
        });
        if (!pkg || !pkg.services.length || pkg.services.some((link) => !link.service) || (online && !PackagesService.isBookableOnline(pkg))) {
            throw PackagesService.notFound();
        }
        return pkg;
    }

    async ensureAllExist(businessId: string, ids: string[]): Promise<void> {
        const count = await this.packages.countBy({ id: In(ids), business: { id: businessId } });
        if (count !== new Set(ids).size) {
            throw PackagesService.notFound();
        }
    }

    async create(businessId: string, dto: CreatePackageDto): Promise<PackageEntity> {
        await this.services.getMany(businessId, dto.serviceIds);
        const displayOrder = dto.displayOrder ?? await nextDisplayOrder(this.packages, { businessId });

        const id = await this.packages.manager.transaction(async (manager) => {
            const pkg = await manager.save(manager.create(PackageEntity, {
                business: { id: businessId },
                name: dto.name.trim(),
                description: dto.description ?? null,
                price: dto.price,
                durationMinutes: dto.durationMinutes,
                commissionMode: dto.commissionMode,
                displayOrder,
                isActive: dto.isActive,
            }));
            await PackagesService.saveServices(manager.getRepository(PackageServiceEntity), pkg.id, dto.serviceIds);
            return pkg.id;
        });
        return this.getById(businessId, id);
    }

    async update(businessId: string, id: string, dto: UpdatePackageDto): Promise<PackageEntity> {
        const pkg = await this.getById(businessId, id);
        if (dto.serviceIds) {
            await this.services.getMany(businessId, dto.serviceIds);
        }

        const changes = Object.fromEntries(Object.entries({
            name: dto.name?.trim(),
            description: dto.description,
            price: dto.price,
            durationMinutes: dto.durationMinutes,
            commissionMode: dto.commissionMode,
            displayOrder: dto.displayOrder,
            isActive: dto.isActive,
        }).filter(([, value]) => value !== undefined));

        await this.packages.manager.transaction(async (manager) => {
            if (Object.keys(changes).length) {
                await manager.update(PackageEntity, { id }, changes);
            }
            if (dto.serviceIds) {
                const links = manager.getRepository(PackageServiceEntity);
                await links.delete({ package: { id: pkg.id } });
                await PackagesService.saveServices(links, pkg.id, dto.serviceIds);
            }
        });
        return this.getById(businessId, id);
    }

    async remove(businessId: string, id: string): Promise<void> {
        const pkg = await this.getById(businessId, id);
        await this.packages.softDelete({ id: pkg.id });
    }

    reorder(businessId: string, ids: string[]): Promise<void> {
        return reorderWithin(this.packages, { businessId }, ids);
    }

    static isBookableOnline(pkg: PackageEntity): boolean {
        return pkg.isActive && pkg.services.length > 0 && pkg.services.every((link) => link.service?.isActive);
    }

    private static async saveServices(links: Repository<PackageServiceEntity>, packageId: string, serviceIds: string[]): Promise<void> {
        await links.save(serviceIds.map((serviceId) => links.create({ package: { id: packageId }, service: { id: serviceId } })));
    }

    private static notFound(): AppException {
        return new AppException(ErrorCode.PACKAGE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Pacote não encontrado.');
    }
}
