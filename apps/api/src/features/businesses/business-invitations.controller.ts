import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { UuidParam } from '../../common/pipes/uuid-param.decorator.js';
import { RateLimit } from '../../common/throttling/rate-limit.decorator.js';
import { BusinessAccess, CurrentMembership, RequiresFullAccess } from './business-access.decorator.js';
import { BusinessInvitationsService } from './business-invitations.service.js';
import { BUSINESS_ID_PARAM, type BusinessMembership } from './business-membership.js';
import { BusinessInvitationResponseDto, CreateBusinessInvitationDto } from './dto/business-invitation.dto.js';

const MANAGERS = [BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN];
const MINUTE_MS = 60 * 1000;
const OWNER_ONLY = 'Só um `owner` gerencia convites com o papel `owner` (`INSUFFICIENT_BUSINESS_ROLE`).';
const INVITATION_NOT_FOUND = 'Convite pendente não encontrado neste negócio (`INVITATION_NOT_FOUND`).';

@ApiTags('business-invitations')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/invitations`)
export class BusinessInvitationsController {

    constructor(private readonly invitations: BusinessInvitationsService) { }

    @Get()
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Lista os convites pendentes', description: 'Inclui expirados (`isExpired`), que podem ser reenviados. Mais recentes primeiro.' })
    @ApiDataResponse(BusinessInvitationResponseDto, { isArray: true })
    async list(@Param(BUSINESS_ID_PARAM) businessId: string): Promise<ApiResponse<BusinessInvitationResponseDto[]>> {
        const invitations = await this.invitations.listPending(businessId);
        return ApiResponse.of(invitations.map((i) => BusinessInvitationResponseDto.from(i)));
    }

    @Post()
    @BusinessAccess(...MANAGERS)
    @RequiresFullAccess()
    @RateLimit(20, 15 * MINUTE_MS)
    @ApiOperation({
        summary: 'Convida alguém para a equipe',
        description: 'Envia em segundo plano um e-mail com o link `FRONTEND_URL/accept-invitation?token=<token>`. A resposta é a mesma, tenha o e-mail conta ou não. '
            + 'Se já houver convite pendente para o e-mail, os papéis são atualizados e um novo link substitui o anterior.',
    })
    @ApiDataResponse(BusinessInvitationResponseDto, { status: HttpStatus.CREATED, description: 'Convite enviado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.FORBIDDEN, OWNER_ONLY)
    @ApiErrorResponse(HttpStatus.CONFLICT, 'O e-mail já é de um membro do negócio (`MEMBER_ALREADY_EXISTS`).')
    async invite(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @CurrentUser('id') userId: string,
        @Body() dto: CreateBusinessInvitationDto,
    ): Promise<ApiResponse<BusinessInvitationResponseDto>> {
        return ApiResponse.of(BusinessInvitationResponseDto.from(await this.invitations.invite(businessId, actor, userId, dto)));
    }

    @Post(':invitationId/resend')
    @BusinessAccess(...MANAGERS)
    @RequiresFullAccess()
    @RateLimit(20, 15 * MINUTE_MS)
    @ApiOperation({ summary: 'Reenvia um convite', description: 'Gera um novo link, com nova validade, e invalida o anterior.' })
    @ApiDataResponse(BusinessInvitationResponseDto, { status: HttpStatus.CREATED, description: 'Convite reenviado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`invitationId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.FORBIDDEN, OWNER_ONLY)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, INVITATION_NOT_FOUND)
    async resend(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @CurrentUser('id') userId: string,
        @UuidParam('invitationId') invitationId: string,
    ): Promise<ApiResponse<BusinessInvitationResponseDto>> {
        return ApiResponse.of(BusinessInvitationResponseDto.from(await this.invitations.resend(businessId, actor, userId, invitationId)));
    }

    @Delete(':invitationId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Revoga um convite', description: 'O link deixa de funcionar.' })
    @ApiNoContentResponse({ description: 'Convite revogado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`invitationId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.FORBIDDEN, OWNER_ONLY)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, INVITATION_NOT_FOUND)
    async revoke(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @UuidParam('invitationId') invitationId: string,
    ): Promise<void> {
        await this.invitations.revoke(businessId, actor, invitationId);
    }
}
