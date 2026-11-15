import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { UuidParam } from '../../common/pipes/uuid-param.decorator.js';
import { BusinessAccess, CurrentMembership } from './business-access.decorator.js';
import { BusinessMembersService } from './business-members.service.js';
import { BUSINESS_ID_PARAM, type BusinessMembership } from './business-membership.js';
import { BusinessMemberResponseDto, UpdateBusinessMemberDto } from './dto/business-member.dto.js';

const MANAGERS = [BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN];
const OWNER_ONLY = 'Só um `owner` gerencia `owner` (`INSUFFICIENT_BUSINESS_ROLE`).';
const MEMBER_NOT_FOUND = 'Membro não encontrado neste negócio (`MEMBER_NOT_FOUND`).';

@ApiTags('business-members')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/members`)
export class BusinessMembersController {

    constructor(private readonly members: BusinessMembersService) { }

    @Get()
    @BusinessAccess()
    @ApiOperation({ summary: 'Lista os membros', description: 'Inclui suspensos; ordenados pelo nome do usuário. Novos membros entram por convite (`/invitations`).' })
    @ApiDataResponse(BusinessMemberResponseDto, { isArray: true })
    async list(@Param(BUSINESS_ID_PARAM) businessId: string): Promise<ApiResponse<BusinessMemberResponseDto[]>> {
        const members = await this.members.list(businessId);
        return ApiResponse.of(members.map((m) => BusinessMemberResponseDto.from(m)));
    }

    @Patch(':memberId')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Altera papéis ou status de um membro', description: 'Só os campos enviados são alterados; `roles` substitui os papéis atuais.' })
    @ApiDataResponse(BusinessMemberResponseDto, { description: 'Membro atualizado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou `memberId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.FORBIDDEN, OWNER_ONLY)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, MEMBER_NOT_FOUND)
    @ApiErrorResponse(HttpStatus.CONFLICT, 'Deixaria o negócio sem `owner` ativo (`LAST_OWNER`).')
    async update(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @UuidParam('memberId') memberId: string,
        @Body() dto: UpdateBusinessMemberDto,
    ): Promise<ApiResponse<BusinessMemberResponseDto>> {
        return ApiResponse.of(BusinessMemberResponseDto.from(await this.members.update(businessId, actor, memberId, dto)));
    }

    @Delete(':memberId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Remove um membro', description: 'Exclusão lógica do vínculo e do perfil de profissional dele, se houver.' })
    @ApiNoContentResponse({ description: 'Membro removido.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`memberId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.FORBIDDEN, OWNER_ONLY)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, MEMBER_NOT_FOUND)
    @ApiErrorResponse(HttpStatus.CONFLICT, 'É o último `owner` ativo (`LAST_OWNER`).')
    async remove(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @UuidParam('memberId') memberId: string,
    ): Promise<void> {
        await this.members.remove(businessId, actor, memberId);
    }
}
