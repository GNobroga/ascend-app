import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { BusinessMemberStatus } from '../../common/enums/business-member-status.enum.js';
import { BusinessStatus } from '../../common/enums/business-status.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { StorageService } from '../../common/storage/storage.service.js';
import { BusinessMemberRoleEntity } from '../../database/entities/business-member-role.entity.js';
import { BusinessMemberEntity } from '../../database/entities/business-member.entity.js';
import { BusinessSettingEntity } from '../../database/entities/business-setting.entity.js';
import { BusinessEntity } from '../../database/entities/business.entity.js';
import type { BusinessMembership } from './business-membership.js';
import { BusinessPaymentMethodsService } from './business-payment-methods.service.js';
import { BusinessSubscriptionsService } from './business-subscriptions.service.js';
import type { CreateBusinessDto } from './dto/create-business.dto.js';
import type { UpdateBusinessDto } from './dto/update-business.dto.js';

@Injectable()
export class BusinessesService {

    constructor(
        @InjectRepository(BusinessEntity) private readonly businesses: Repository<BusinessEntity>,
        @InjectRepository(BusinessMemberEntity) private readonly members: Repository<BusinessMemberEntity>,
        private readonly storage: StorageService,
        private readonly paymentMethods: BusinessPaymentMethodsService,
        private readonly subscriptions: BusinessSubscriptionsService,
    ) { }

    async create(userId: string, dto: CreateBusinessDto): Promise<BusinessEntity> {
        await this.ensureSlugAvailable(dto.slug);
        await this.ensureTaxIdAvailable(dto.taxId);

        return this.businesses.manager.transaction(async (manager) => {
            const business = await manager.save(manager.create(BusinessEntity, {
                name: dto.name.trim(),
                slug: dto.slug,
                description: dto.description ?? null,
                email: dto.email.trim().toLowerCase(),
                taxId: dto.taxId,
                phone: dto.phone ?? null,
                phoneIsWhatsApp: !!dto.phone && (dto.phoneIsWhatsApp ?? false),
                timezone: dto.timezone,
                address: { ...dto.address, complement: dto.address.complement ?? null },
            }));
            await manager.save(manager.create(BusinessSettingEntity, { business }));
            await this.paymentMethods.createDefaults(manager, business.id);
            await this.subscriptions.startTrial(manager, business.id, userId);

            const member = await manager.save(manager.create(BusinessMemberEntity, { business, user: { id: userId } }));
            await manager.save(manager.create(BusinessMemberRoleEntity, { member, role: BusinessMemberRole.OWNER }));

            return business;
        });
    }

    async getById(id: string): Promise<BusinessEntity> {
        const business = await this.businesses.findOneBy({ id });
        if (!business) {
            throw BusinessesService.notFound();
        }
        return business;
    }

    async getActiveBySlug(slug: string): Promise<BusinessEntity> {
        const business = await this.businesses.findOneBy({ slug, status: BusinessStatus.ACTIVE });
        if (!business) {
            throw BusinessesService.notFound();
        }
        return business;
    }

    async getPublicBySlug(slug: string): Promise<BusinessEntity> {
        const business = await this.businesses.findOne({
            where: { slug, status: BusinessStatus.ACTIVE },
            relations: { hours: true, images: true, socialLinks: true },
            order: { hours: { dayOfWeek: 'ASC' }, images: { displayOrder: 'ASC', createdAt: 'ASC' } },
        });
        if (!business) {
            throw BusinessesService.notFound();
        }
        return business;
    }

    async update(id: string, dto: UpdateBusinessDto): Promise<BusinessEntity> {
        const business = await this.getById(id);

        if (dto.slug !== undefined && dto.slug !== business.slug) {
            await this.ensureSlugAvailable(dto.slug);
        }

        this.businesses.merge(business, {
            name: dto.name?.trim(),
            slug: dto.slug,
            description: dto.description,
            email: dto.email?.trim().toLowerCase(),
            phone: dto.phone,
            phoneIsWhatsApp: dto.phoneIsWhatsApp,
            timezone: dto.timezone,
            address: dto.address && { ...dto.address, complement: dto.address.complement ?? null },
        });
        business.phoneIsWhatsApp &&= business.phone !== null;

        return this.businesses.save(business);
    }

    async setLogo(id: string, file: Buffer): Promise<BusinessEntity> {
        const business = await this.getById(id);
        business.logoKey = await this.storage.replaceImage(`businesses/${id}/logo`, file, business.logoKey, async (logoKey) => {
            await this.businesses.update({ id }, { logoKey });
        });
        return business;
    }

    async removeLogo(id: string): Promise<void> {
        const business = await this.getById(id);
        if (!business.logoKey) {
            return;
        }
        const { logoKey } = business;
        business.logoKey = null;
        await this.businesses.save(business);
        await this.storage.delete(logoKey);
    }

    findMembershipsOfUser(userId: string): Promise<BusinessMemberEntity[]> {
        return this.activeMembers()
            .innerJoinAndSelect('member.business', 'business')
            .andWhere('"member"."userId" = :userId', { userId })
            .orderBy('business.name', 'ASC')
            .getMany();
    }

    async findActiveMembership(businessId: string, userId: string): Promise<BusinessMembership | null> {
        const member = await this.activeMembers()
            .innerJoin('member.business', 'business')
            .andWhere('business.id = :businessId', { businessId })
            .andWhere('"member"."userId" = :userId', { userId })
            .getOne();

        return member && { id: member.id, businessId, roles: member.roles.map((r) => r.role) };
    }

    private activeMembers() {
        return this.members.createQueryBuilder('member')
            .leftJoinAndSelect('member.roles', 'role')
            .where('member.status = :status', { status: BusinessMemberStatus.ACTIVE });
    }

    // Os índices únicos de slug e taxId não são parciais: negócios excluídos (soft delete) continuam ocupando os valores.
    private async ensureSlugAvailable(slug: string): Promise<void> {
        if (await this.businesses.exists({ where: { slug }, withDeleted: true })) {
            throw new AppException(ErrorCode.BUSINESS_SLUG_IN_USE, HttpStatus.CONFLICT, 'Slug já está em uso.');
        }
    }

    private async ensureTaxIdAvailable(taxId: string): Promise<void> {
        if (await this.businesses.exists({ where: { taxId }, withDeleted: true })) {
            throw new AppException(ErrorCode.BUSINESS_TAX_ID_IN_USE, HttpStatus.CONFLICT, 'CPF/CNPJ já cadastrado.');
        }
    }

    static notFound(): AppException {
        return new AppException(ErrorCode.BUSINESS_NOT_FOUND, HttpStatus.NOT_FOUND, 'Negócio não encontrado.');
    }
}
