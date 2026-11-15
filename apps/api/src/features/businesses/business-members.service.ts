import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository, type EntityManager } from 'typeorm';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { BusinessMemberStatus } from '../../common/enums/business-member-status.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { BusinessMemberRoleEntity } from '../../database/entities/business-member-role.entity.js';
import { BusinessMemberEntity } from '../../database/entities/business-member.entity.js';
import { ProfessionalEntity } from '../../database/entities/professional.entity.js';
import type { BusinessMembership } from './business-membership.js';
import type { UpdateBusinessMemberDto } from './dto/business-member.dto.js';

const MEMBER_RELATIONS = { user: true, business: true, roles: true, professional: true } as const;

@Injectable()
export class BusinessMembersService {

    constructor(@InjectRepository(BusinessMemberEntity) private readonly members: Repository<BusinessMemberEntity>) { }

    list(businessId: string): Promise<BusinessMemberEntity[]> {
        return this.members.find({
            where: { business: { id: businessId } },
            relations: MEMBER_RELATIONS,
            order: { user: { name: 'ASC' } },
        });
    }

    async getById(businessId: string, id: string): Promise<BusinessMemberEntity> {
        const member = await this.members.findOne({ where: { id, business: { id: businessId } }, relations: MEMBER_RELATIONS });
        if (!member) {
            throw new AppException(ErrorCode.MEMBER_NOT_FOUND, HttpStatus.NOT_FOUND, 'Membro não encontrado.');
        }
        return member;
    }

    async findManagerUserIds(businessId: string): Promise<string[]> {
        const managers = await this.members.find({
            where: {
                business: { id: businessId },
                status: BusinessMemberStatus.ACTIVE,
                roles: { role: In([BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN]) },
            },
            relations: { user: true },
        });
        return [...new Set(managers.map((m) => m.user.id))];
    }

    isMember(businessId: string, email: string): Promise<boolean> {
        return this.members.exists({ where: { business: { id: businessId }, user: { email } } });
    }

    async join(manager: EntityManager, businessId: string, userId: string, roles: BusinessMemberRole[]): Promise<string> {
        const repo = manager.getRepository(BusinessMemberEntity);
        const existing = await repo.findOne({ where: { business: { id: businessId }, user: { id: userId } }, withDeleted: true });
        if (existing && !existing.deletedAt) {
            throw BusinessMembersService.alreadyMember();
        }

        const member = existing
            ? repo.merge(existing, { deletedAt: null, status: BusinessMemberStatus.ACTIVE, joinedAt: new Date() })
            : repo.create({ business: { id: businessId }, user: { id: userId } });
        const saved = await repo.save(member);
        await BusinessMembersService.replaceRoles(manager, saved.id, roles);
        return saved.id;
    }

    async update(businessId: string, actor: BusinessMembership, id: string, dto: UpdateBusinessMemberDto): Promise<BusinessMemberEntity> {
        const member = await this.getById(businessId, id);
        const currentRoles = member.roles.map((r) => r.role);
        const roles = dto.roles ?? currentRoles;
        const status = dto.status ?? member.status;

        BusinessMembersService.ensureCanManageOwners(actor, [...currentRoles, ...roles].includes(BusinessMemberRole.OWNER));
        if (!BusinessMembersService.isActiveOwner(roles, status)) {
            await this.ensureNotLastOwner(businessId, member, currentRoles);
        }

        await this.members.manager.transaction(async (manager) => {
            await manager.update(BusinessMemberEntity, { id }, { status });
            if (dto.roles) {
                await BusinessMembersService.replaceRoles(manager, id, dto.roles);
            }
        });

        return this.getById(businessId, id);
    }

    async remove(businessId: string, actor: BusinessMembership, id: string): Promise<void> {
        const member = await this.getById(businessId, id);
        const roles = member.roles.map((r) => r.role);

        BusinessMembersService.ensureCanManageOwners(actor, roles.includes(BusinessMemberRole.OWNER));
        await this.ensureNotLastOwner(businessId, member, roles);

        await this.members.manager.transaction(async (manager) => {
            await manager.softDelete(ProfessionalEntity, { member: { id } });
            await manager.softDelete(BusinessMemberEntity, { id });
        });
    }

    private async ensureNotLastOwner(businessId: string, member: BusinessMemberEntity, roles: BusinessMemberRole[]): Promise<void> {
        if (!BusinessMembersService.isActiveOwner(roles, member.status)) {
            return;
        }
        const otherActiveOwners = await this.members.count({
            where: {
                id: Not(member.id),
                business: { id: businessId },
                status: BusinessMemberStatus.ACTIVE,
                roles: { role: BusinessMemberRole.OWNER },
            },
        });
        if (otherActiveOwners === 0) {
            throw new AppException(ErrorCode.LAST_OWNER, HttpStatus.CONFLICT, 'O negócio precisa de ao menos um owner ativo.');
        }
    }

    private static async replaceRoles(manager: EntityManager, memberId: string, roles: BusinessMemberRole[]): Promise<void> {
        await manager.delete(BusinessMemberRoleEntity, { member: { id: memberId } });
        await manager.save(roles.map((role) => manager.create(BusinessMemberRoleEntity, { member: { id: memberId }, role })));
    }

    private static isActiveOwner(roles: BusinessMemberRole[], status: BusinessMemberStatus): boolean {
        return status === BusinessMemberStatus.ACTIVE && roles.includes(BusinessMemberRole.OWNER);
    }

    static ensureCanManageOwners(actor: BusinessMembership, touchesOwner: boolean): void {
        if (touchesOwner && !actor.roles.includes(BusinessMemberRole.OWNER)) {
            throw new AppException(ErrorCode.INSUFFICIENT_BUSINESS_ROLE, HttpStatus.FORBIDDEN, 'Só um owner pode gerenciar owners.');
        }
    }

    static alreadyMember(): AppException {
        return new AppException(ErrorCode.MEMBER_ALREADY_EXISTS, HttpStatus.CONFLICT, 'O usuário já é membro deste negócio.');
    }
}
