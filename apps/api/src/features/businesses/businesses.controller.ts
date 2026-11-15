import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { ImageUpload, UploadedImage } from '../../common/storage/image-upload.decorator.js';
import { BusinessAccess } from './business-access.decorator.js';
import { BusinessHoursService } from './business-hours.service.js';
import { BUSINESS_ID_PARAM } from './business-membership.js';
import { BusinessSettingsService } from './business-settings.service.js';
import { BusinessSocialLinksService } from './business-social-links.service.js';
import { BusinessesService } from './businesses.service.js';
import { BusinessHourDto } from './dto/business-hour.dto.js';
import { BusinessResponseDto } from './dto/business-response.dto.js';
import { BusinessSettingResponseDto, UpdateBusinessSettingDto } from './dto/business-setting.dto.js';
import { BusinessSocialLinkDto, SetBusinessSocialLinksDto } from './dto/business-social-link.dto.js';
import { CreateBusinessDto } from './dto/create-business.dto.js';
import { MyBusinessResponseDto } from './dto/my-business-response.dto.js';
import { SetBusinessHoursDto } from './dto/set-business-hours.dto.js';
import { UpdateBusinessDto } from './dto/update-business.dto.js';

@ApiTags('businesses')
@Controller('/api/businesses')
export class BusinessesController {

    constructor(
        private readonly businesses: BusinessesService,
        private readonly hours: BusinessHoursService,
        private readonly settings: BusinessSettingsService,
        private readonly socialLinks: BusinessSocialLinksService,
    ) { }

    @Post()
    @ApiCookieAuth()
    @ApiOperation({ summary: 'Cria um negócio', description: 'O usuário autenticado vira membro `owner` do negócio. As configurações de agendamento são criadas com os valores padrão.' })
    @ApiDataResponse(BusinessResponseDto, { status: HttpStatus.CREATED, description: 'Negócio criado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Access token ausente ou inválido (`UNAUTHENTICATED`).')
    @ApiErrorResponse(HttpStatus.CONFLICT, 'Slug já em uso (`BUSINESS_SLUG_IN_USE`) ou CPF/CNPJ já cadastrado (`BUSINESS_TAX_ID_IN_USE`).')
    async create(@CurrentUser('id') userId: string, @Body() dto: CreateBusinessDto): Promise<ApiResponse<BusinessResponseDto>> {
        return ApiResponse.of(BusinessResponseDto.from(await this.businesses.create(userId, dto)));
    }

    @Get('mine')
    @ApiCookieAuth()
    @ApiOperation({ summary: 'Negócios do usuário', description: 'Negócios em que o usuário autenticado é membro ativo, com os papéis dele em cada um, ordenados por nome.' })
    @ApiDataResponse(MyBusinessResponseDto, { isArray: true })
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Access token ausente ou inválido (`UNAUTHENTICATED`).')
    async mine(@CurrentUser('id') userId: string): Promise<ApiResponse<MyBusinessResponseDto[]>> {
        const memberships = await this.businesses.findMembershipsOfUser(userId);
        return ApiResponse.of(memberships.map((m) => MyBusinessResponseDto.from(m)));
    }

    @Get(`:${BUSINESS_ID_PARAM}`)
    @BusinessAccess()
    @ApiOperation({ summary: 'Detalhes do negócio' })
    @ApiDataResponse(BusinessResponseDto)
    async findOne(@Param(BUSINESS_ID_PARAM) businessId: string): Promise<ApiResponse<BusinessResponseDto>> {
        return ApiResponse.of(BusinessResponseDto.from(await this.businesses.getById(businessId)));
    }

    @Patch(`:${BUSINESS_ID_PARAM}`)
    @BusinessAccess(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
    @ApiOperation({ summary: 'Atualiza o negócio', description: 'Só os campos enviados são alterados. CPF/CNPJ não pode ser alterado.' })
    @ApiDataResponse(BusinessResponseDto, { description: 'Negócio atualizado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.CONFLICT, 'Slug já em uso (`BUSINESS_SLUG_IN_USE`).')
    async update(@Param(BUSINESS_ID_PARAM) businessId: string, @Body() dto: UpdateBusinessDto): Promise<ApiResponse<BusinessResponseDto>> {
        return ApiResponse.of(BusinessResponseDto.from(await this.businesses.update(businessId, dto)));
    }

    @Get(`:${BUSINESS_ID_PARAM}/hours`)
    @BusinessAccess()
    @ApiOperation({ summary: 'Horário de funcionamento', description: 'Ordenado por dia da semana; vazio se ainda não configurado.' })
    @ApiDataResponse(BusinessHourDto, { isArray: true })
    async getHours(@Param(BUSINESS_ID_PARAM) businessId: string): Promise<ApiResponse<BusinessHourDto[]>> {
        const hours = await this.hours.findByBusiness(businessId);
        return ApiResponse.of(hours.map((h) => BusinessHourDto.from(h)));
    }

    @Put(`:${BUSINESS_ID_PARAM}/hours`)
    @BusinessAccess(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
    @ApiOperation({ summary: 'Define o horário de funcionamento', description: 'Substitui a semana inteira; os 7 dias são obrigatórios.' })
    @ApiDataResponse(BusinessHourDto, { isArray: true, description: 'Semana gravada, ordenada por dia.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos, dia repetido ou fechamento antes da abertura (`VALIDATION_ERROR`).')
    async setHours(@Param(BUSINESS_ID_PARAM) businessId: string, @Body() dto: SetBusinessHoursDto): Promise<ApiResponse<BusinessHourDto[]>> {
        const hours = await this.hours.replaceWeek(businessId, dto.hours);
        return ApiResponse.of(hours.map((h) => BusinessHourDto.from(h)));
    }

    @Get(`:${BUSINESS_ID_PARAM}/social-links`)
    @BusinessAccess()
    @ApiOperation({ summary: 'Redes sociais', description: 'Na ordem fixa das redes (Instagram, Facebook, TikTok, YouTube, X, LinkedIn, site); vazio se nenhuma.' })
    @ApiDataResponse(BusinessSocialLinkDto, { isArray: true })
    async getSocialLinks(@Param(BUSINESS_ID_PARAM) businessId: string): Promise<ApiResponse<BusinessSocialLinkDto[]>> {
        return ApiResponse.of(BusinessSocialLinkDto.fromAll(await this.socialLinks.findByBusiness(businessId)));
    }

    @Put(`:${BUSINESS_ID_PARAM}/social-links`)
    @BusinessAccess(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
    @ApiOperation({ summary: 'Define as redes sociais', description: 'Substitui todos os links pela lista enviada. Aparecem na página pública.' })
    @ApiDataResponse(BusinessSocialLinkDto, { isArray: true, description: 'Links gravados, na ordem fixa das redes.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos, rede repetida, URL sem `https` ou fora do domínio da rede (`VALIDATION_ERROR`).')
    async setSocialLinks(@Param(BUSINESS_ID_PARAM) businessId: string, @Body() dto: SetBusinessSocialLinksDto): Promise<ApiResponse<BusinessSocialLinkDto[]>> {
        return ApiResponse.of(BusinessSocialLinkDto.fromAll(await this.socialLinks.replaceAll(businessId, dto.links)));
    }

    @Get(`:${BUSINESS_ID_PARAM}/settings`)
    @BusinessAccess()
    @ApiOperation({ summary: 'Configurações de agendamento' })
    @ApiDataResponse(BusinessSettingResponseDto)
    async getSettings(@Param(BUSINESS_ID_PARAM) businessId: string): Promise<ApiResponse<BusinessSettingResponseDto>> {
        return ApiResponse.of(BusinessSettingResponseDto.from(await this.settings.getByBusiness(businessId)));
    }

    @Patch(`:${BUSINESS_ID_PARAM}/settings`)
    @BusinessAccess(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
    @ApiOperation({ summary: 'Atualiza as configurações de agendamento', description: 'Só os campos enviados são alterados.' })
    @ApiDataResponse(BusinessSettingResponseDto, { description: 'Configurações atualizadas.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou antecedência mínima que não cabe na máxima (`VALIDATION_ERROR`).')
    async updateSettings(@Param(BUSINESS_ID_PARAM) businessId: string, @Body() dto: UpdateBusinessSettingDto): Promise<ApiResponse<BusinessSettingResponseDto>> {
        return ApiResponse.of(BusinessSettingResponseDto.from(await this.settings.update(businessId, dto)));
    }

    @Put(`:${BUSINESS_ID_PARAM}/logo`)
    @BusinessAccess(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
    @ImageUpload()
    @ApiOperation({ summary: 'Define o logotipo', description: 'Substitui o logotipo atual, cujo arquivo é removido do storage.' })
    @ApiDataResponse(BusinessResponseDto, { description: 'Negócio com o novo `logoUrl`.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Arquivo ausente (`VALIDATION_ERROR`) ou que não é imagem (`INVALID_IMAGE`).')
    async setLogo(@Param(BUSINESS_ID_PARAM) businessId: string, @UploadedImage() file: Buffer): Promise<ApiResponse<BusinessResponseDto>> {
        return ApiResponse.of(BusinessResponseDto.from(await this.businesses.setLogo(businessId, file)));
    }

    @Delete(`:${BUSINESS_ID_PARAM}/logo`)
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
    @ApiOperation({ summary: 'Remove o logotipo', description: 'Remove também o arquivo do storage. Sem logotipo, não faz nada.' })
    @ApiNoContentResponse({ description: 'Logotipo removido.' })
    async removeLogo(@Param(BUSINESS_ID_PARAM) businessId: string): Promise<void> {
        await this.businesses.removeLogo(businessId);
    }
}
