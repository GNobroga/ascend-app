import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { MailDispatcher } from '../../common/mail/mail-dispatcher.service.js';
import { generateOpaqueToken, hashOpaqueToken } from '../../common/utilities/opaque-token.js';
import { env } from '../../config/env.config.js';
import { BusinessInvitationEntity } from '../../database/entities/business-invitation.entity.js';
import type { BusinessMemberEntity } from '../../database/entities/business-member.entity.js';
import { UsersService } from '../users/index.js';
import { BusinessMembersService } from './business-members.service.js';
import type { BusinessMembership } from './business-membership.js';
import { BusinessesService } from './businesses.service.js';
import type { CreateBusinessInvitationDto } from './dto/business-invitation.dto.js';
import { BusinessInvitationMail } from './mails/business-invitation.mail.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const PENDING = { acceptedAt: IsNull(), declinedAt: IsNull(), revokedAt: IsNull() } as const;

@Injectable()
export class BusinessInvitationsService {

    constructor(
        @InjectRepository(BusinessInvitationEntity) private readonly invitations: Repository<BusinessInvitationEntity>,
        private readonly businesses: BusinessesService,
        private readonly members: BusinessMembersService,
        private readonly users: UsersService,
        private readonly mail: MailDispatcher,
    ) { }

    listPending(businessId: string): Promise<BusinessInvitationEntity[]> {
        return this.invitations.find({
            where: { business: { id: businessId }, ...PENDING },
            relations: { invitedBy: true },
            order: { createdAt: 'DESC' },
        });
    }

    async invite(businessId: string, actor: BusinessMembership, inviterId: string, dto: CreateBusinessInvitationDto): Promise<BusinessInvitationEntity> {
        BusinessMembersService.ensureCanManageOwners(actor, dto.roles.includes(BusinessMemberRole.OWNER));

        const email = UsersService.normalizeEmail(dto.email);
        if (await this.members.isMember(businessId, email)) {
            throw BusinessMembersService.alreadyMember();
        }

        const pending = await this.invitations.findOneBy({ business: { id: businessId }, email, ...PENDING });
        const invitation = pending
            ? this.invitations.merge(pending, { roles: dto.roles })
            : this.invitations.create({ business: { id: businessId }, email, roles: dto.roles });

        return this.issueAndSend(businessId, invitation, inviterId);
    }

    async resend(businessId: string, actor: BusinessMembership, inviterId: string, id: string): Promise<BusinessInvitationEntity> {
        const invitation = await this.getPending(businessId, id);
        BusinessMembersService.ensureCanManageOwners(actor, invitation.roles.includes(BusinessMemberRole.OWNER));
        return this.issueAndSend(businessId, invitation, inviterId);
    }

    async revoke(businessId: string, actor: BusinessMembership, id: string): Promise<void> {
        const invitation = await this.getPending(businessId, id);
        BusinessMembersService.ensureCanManageOwners(actor, invitation.roles.includes(BusinessMemberRole.OWNER));
        await this.invitations.update({ id: invitation.id }, { revokedAt: new Date() });
    }

    async accept(token: string, userId: string): Promise<BusinessMemberEntity> {
        const invitation = await this.findValidFor(token, userId);
        const businessId = invitation.business.id;

        const memberId = await this.invitations.manager.transaction(async (manager) => {
            await BusinessInvitationsService.close(manager.getRepository(BusinessInvitationEntity), invitation.id, { acceptedAt: new Date() });
            return this.members.join(manager, businessId, userId, invitation.roles);
        });

        // O token chegou neste e-mail, o que comprova que a conta é dona dele.
        await this.users.markEmailVerified(userId);
        return this.members.getById(businessId, memberId);
    }

    async decline(token: string, userId: string): Promise<void> {
        const invitation = await this.findValidFor(token, userId);
        await BusinessInvitationsService.close(this.invitations, invitation.id, { declinedAt: new Date() });
    }

    private async issueAndSend(businessId: string, invitation: BusinessInvitationEntity, inviterId: string): Promise<BusinessInvitationEntity> {
        const [business, inviter] = await Promise.all([this.businesses.getById(businessId), this.users.findById(inviterId)]);

        const token = generateOpaqueToken();
        this.invitations.merge(invitation, {
            tokenHash: hashOpaqueToken(token),
            expiresAt: new Date(Date.now() + env.BUSINESS_INVITATION_TTL_DAYS * DAY_MS),
            invitedBy: inviter,
        });
        const saved = await this.invitations.save(invitation);

        const url = new URL('/accept-invitation', env.FRONTEND_URL);
        url.searchParams.set('token', token);
        this.mail.dispatch(BusinessInvitationMail, {
            to: { address: saved.email },
            data: {
                businessName: business.name,
                inviterName: inviter?.name ?? business.name,
                roles: saved.roles,
                url: url.toString(),
                ttlDays: env.BUSINESS_INVITATION_TTL_DAYS,
            },
        });

        return saved;
    }

    private async getPending(businessId: string, id: string): Promise<BusinessInvitationEntity> {
        const invitation = await this.invitations.findOne({ where: { id, business: { id: businessId }, ...PENDING }, relations: { invitedBy: true } });
        if (!invitation) {
            throw new AppException(ErrorCode.INVITATION_NOT_FOUND, HttpStatus.NOT_FOUND, 'Convite não encontrado.');
        }
        return invitation;
    }

    async getByToken(token: string): Promise<BusinessInvitationEntity> {
        const invitation = await this.invitations.findOne({
            where: { tokenHash: hashOpaqueToken(token), expiresAt: MoreThan(new Date()), ...PENDING },
            relations: { business: true },
        });
        if (!invitation?.business) {
            throw BusinessInvitationsService.invalidToken();
        }
        return invitation;
    }

    private async findValidFor(token: string, userId: string): Promise<BusinessInvitationEntity> {
        const invitation = await this.getByToken(token);
        const user = await this.users.findById(userId);
        if (user?.email !== invitation.email) {
            throw new AppException(ErrorCode.INVITATION_EMAIL_MISMATCH, HttpStatus.FORBIDDEN, 'Este convite foi enviado para outro e-mail.');
        }
        return invitation;
    }

    /** Encerra o convite só se ele ainda estiver pendente, para que dois aceites simultâneos não passem. */
    private static async close(
        repo: Repository<BusinessInvitationEntity>,
        id: string,
        closing: Partial<Pick<BusinessInvitationEntity, 'acceptedAt' | 'declinedAt'>>,
    ): Promise<void> {
        const { affected } = await repo.update({ id, ...PENDING }, closing);
        if (!affected) {
            throw BusinessInvitationsService.invalidToken();
        }
    }

    private static invalidToken(): AppException {
        return new AppException(ErrorCode.INVALID_INVITATION_TOKEN, HttpStatus.BAD_REQUEST, 'Convite inválido, expirado ou já usado.');
    }
}
