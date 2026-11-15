import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessMemberStatus } from '../../common/enums/business-member-status.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { StorageService } from '../../common/storage/storage.service.js';
import { ProfessionalPackageEntity } from '../../database/entities/professional-package.entity.js';
import { ProfessionalServiceEntity } from '../../database/entities/professional-service.entity.js';
import { ProfessionalSpecialtyEntity } from '../../database/entities/professional-specialty.entity.js';
import { ProfessionalEntity } from '../../database/entities/professional.entity.js';
import { BusinessMembersService } from '../businesses/index.js';
import { PackagesService, ServicesService } from '../catalog/index.js';
import type { CreateProfessionalDto, ProfessionalPackageItemDto, ProfessionalServiceItemDto, UpdateProfessionalDto } from './dto/professional.dto.js';
import { SpecialtiesService } from './specialties.service.js';

const PROFESSIONAL_RELATIONS = { member: true, services: { service: true }, packages: { package: true }, specialties: { specialty: true } } as const;

@Injectable()
export class ProfessionalsService {

    constructor(
        @InjectRepository(ProfessionalEntity) private readonly professionals: Repository<ProfessionalEntity>,
        private readonly members: BusinessMembersService,
        private readonly services: ServicesService,
        private readonly packages: PackagesService,
        private readonly specialties: SpecialtiesService,
        private readonly storage: StorageService,
    ) { }

    list(businessId: string): Promise<ProfessionalEntity[]> {
        return this.professionals.find({
            where: { member: { business: { id: businessId } } },
            relations: PROFESSIONAL_RELATIONS,
            order: { displayName: 'ASC', specialties: { specialty: { name: 'ASC' } } },
        });
    }

    listBookable(businessId: string, serviceIds: string[] = []): Promise<ProfessionalEntity[]> {
        const qb = this.professionals.createQueryBuilder('professional')
            .innerJoin('professional.member', 'member')
            .leftJoinAndSelect('professional.specialties', 'link')
            .leftJoinAndSelect('link.specialty', 'specialty')
            .where('"member"."businessId" = :businessId', { businessId })
            .andWhere('member.status = :status', { status: BusinessMemberStatus.ACTIVE });

        if (serviceIds.length) {
            qb.andWhere(`professional.id IN (
                SELECT ps."professionalId" FROM professional_services ps
                WHERE ps."serviceId" IN (:...serviceIds)
                GROUP BY ps."professionalId"
                HAVING count(DISTINCT ps."serviceId") = :serviceCount
            )`, { serviceIds, serviceCount: serviceIds.length });
        }

        return qb.orderBy('professional.displayName', 'ASC').addOrderBy('specialty.name', 'ASC').getMany();
    }

    hasBookable(businessId: string): Promise<boolean> {
        return this.professionals.createQueryBuilder('professional')
            .innerJoin('professional.member', 'member')
            .where('"member"."businessId" = :businessId', { businessId })
            .andWhere('member.status = :status', { status: BusinessMemberStatus.ACTIVE })
            .andWhere(`EXISTS (
                SELECT 1 FROM professional_working_hours wh
                WHERE wh."professionalId" = professional.id AND NOT wh."isDayOff"
            )`)
            .andWhere(`(
                EXISTS (SELECT 1 FROM professional_services ps WHERE ps."professionalId" = professional.id)
                OR EXISTS (SELECT 1 FROM professional_packages pp WHERE pp."professionalId" = professional.id)
            )`)
            .getExists();
    }

    listBookableForPackage(businessId: string, packageId: string): Promise<ProfessionalEntity[]> {
        return this.professionals.createQueryBuilder('professional')
            .innerJoin('professional.member', 'member')
            .innerJoin('professional.packages', 'link', '"link"."packageId" = :packageId', { packageId })
            .where('"member"."businessId" = :businessId', { businessId })
            .andWhere('member.status = :status', { status: BusinessMemberStatus.ACTIVE })
            .orderBy('professional.displayName', 'ASC')
            .getMany();
    }

    async getById(businessId: string, id: string): Promise<ProfessionalEntity> {
        const professional = await this.professionals.findOne({
            where: { id, member: { business: { id: businessId } } },
            relations: PROFESSIONAL_RELATIONS,
            order: { specialties: { specialty: { name: 'ASC' } } },
        });
        if (!professional) {
            throw ProfessionalsService.notFound();
        }
        return professional;
    }


    findWithUser(id: string): Promise<ProfessionalEntity | null> {
        return this.professionals.findOne({ where: { id }, relations: { member: { user: true } }, withDeleted: true });
    }

    findByMember(businessId: string, memberId: string): Promise<ProfessionalEntity | null> {
        return this.professionals.findOneBy({ member: { id: memberId, business: { id: businessId } } });
    }

    async ensureExists(businessId: string, id: string): Promise<void> {
        if (!await this.professionals.existsBy({ id, member: { business: { id: businessId } } })) {
            throw ProfessionalsService.notFound();
        }
    }

    async create(businessId: string, dto: CreateProfessionalDto): Promise<ProfessionalEntity> {
        const member = await this.members.getById(businessId, dto.memberId);

        const existing = await this.professionals.findOne({ where: { member: { id: member.id } }, withDeleted: true });
        if (existing && !existing.deletedAt) {
            throw new AppException(ErrorCode.PROFESSIONAL_ALREADY_EXISTS, HttpStatus.CONFLICT, 'O membro já tem perfil de profissional.');
        }

        const fields = {
            displayName: dto.displayName.trim(),
            bio: dto.bio ?? null,
            commissionPercent: dto.commissionPercent ?? 0,
        };
        const professional = existing
            ? this.professionals.merge(existing, { ...fields, deletedAt: null })
            : this.professionals.create({ ...fields, member: { id: member.id } });
        const saved = await this.professionals.save(professional);

        return this.getById(businessId, saved.id);
    }

    async update(businessId: string, id: string, dto: UpdateProfessionalDto): Promise<ProfessionalEntity> {
        await this.ensureExists(businessId, id);
        await this.professionals.update({ id }, {
            displayName: dto.displayName?.trim(),
            bio: dto.bio,
            commissionPercent: dto.commissionPercent,
        });
        return this.getById(businessId, id);
    }

    async remove(businessId: string, id: string): Promise<void> {
        await this.ensureExists(businessId, id);
        await this.professionals.softDelete({ id });
    }

    async setPhoto(businessId: string, id: string, file: Buffer): Promise<ProfessionalEntity> {
        const professional = await this.getById(businessId, id);
        professional.photoKey = await this.storage.replaceImage(`businesses/${businessId}/professionals/${id}`, file, professional.photoKey, async (photoKey) => {
            await this.professionals.update({ id }, { photoKey });
        });
        return professional;
    }

    async removePhoto(businessId: string, id: string): Promise<void> {
        const professional = await this.getById(businessId, id);
        if (!professional.photoKey) {
            return;
        }
        await this.professionals.update({ id }, { photoKey: null });
        await this.storage.delete(professional.photoKey);
    }

    async replaceServices(businessId: string, id: string, items: ProfessionalServiceItemDto[]): Promise<ProfessionalEntity> {
        await this.ensureExists(businessId, id);
        await Promise.all(items.map((item) => this.services.getById(businessId, item.serviceId)));

        await this.professionals.manager.transaction(async (manager) => {
            await manager.delete(ProfessionalServiceEntity, { professional: { id } });
            await manager.save(items.map((item) => manager.create(ProfessionalServiceEntity, {
                professional: { id },
                service: { id: item.serviceId },
                commissionPercent: item.commissionPercent ?? null,
            })));
        });

        return this.getById(businessId, id);
    }

    async replacePackages(businessId: string, id: string, items: ProfessionalPackageItemDto[]): Promise<ProfessionalEntity> {
        await this.ensureExists(businessId, id);
        if (items.length) {
            await this.packages.ensureAllExist(businessId, items.map((item) => item.packageId));
        }

        await this.professionals.manager.transaction(async (manager) => {
            await manager.delete(ProfessionalPackageEntity, { professional: { id } });
            await manager.save(items.map((item) => manager.create(ProfessionalPackageEntity, {
                professional: { id },
                package: { id: item.packageId },
                commissionPercent: item.commissionPercent ?? null,
            })));
        });

        return this.getById(businessId, id);
    }

    async replaceSpecialties(businessId: string, id: string, specialtyIds: string[]): Promise<ProfessionalEntity> {
        await this.ensureExists(businessId, id);
        await this.specialties.ensureAllExist(businessId, specialtyIds);

        await this.professionals.manager.transaction(async (manager) => {
            await manager.delete(ProfessionalSpecialtyEntity, { professional: { id } });
            await manager.save(specialtyIds.map((specialtyId) => manager.create(ProfessionalSpecialtyEntity, {
                professional: { id },
                specialty: { id: specialtyId },
            })));
        });

        return this.getById(businessId, id);
    }

    private static notFound(): AppException {
        return new AppException(ErrorCode.PROFESSIONAL_NOT_FOUND, HttpStatus.NOT_FOUND, 'Profissional não encontrado.');
    }
}
