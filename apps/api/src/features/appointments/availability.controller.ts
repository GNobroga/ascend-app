import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { IsPublic } from '../../common/auth/public.decorator.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { BUSINESS_ID_PARAM, BusinessAccess, BusinessesService } from '../businesses/index.js';
import { AvailabilityService } from './availability.service.js';
import { AvailabilityQueryDto, AvailabilityResponseDto } from './dto/availability.dto.js';

const INVALID_QUERY = 'Query inválida, ou nenhum ou ambos entre `serviceIds` e `packageId` (`VALIDATION_ERROR`).';
const NOT_FOUND = 'Serviço (`SERVICE_NOT_FOUND`) ou pacote (`PACKAGE_NOT_FOUND`) não encontrado, ou profissional que não existe, não executa todos os serviços, não está ligado ao pacote ou está suspenso (`PROFESSIONAL_NOT_FOUND`).';
const DESCRIPTION = 'Horário do negócio ∩ horário de trabalho − ausências − agendamentos (exceto cancelados e `no_show`), na grade de `slotIntervalMinutes`. '
    + 'O atendimento inteiro precisa caber no expediente.';

@ApiTags('availability')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/availability`)
export class AvailabilityController {

    constructor(
        private readonly businesses: BusinessesService,
        private readonly availability: AvailabilityService,
    ) { }

    @Get()
    @BusinessAccess()
    @ApiOperation({ summary: 'Horários livres (equipe)', description: `${DESCRIPTION} Ignora a antecedência mínima e máxima, para permitir encaixe; aceita serviços inativos.` })
    @ApiDataResponse(AvailabilityResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, INVALID_QUERY)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, NOT_FOUND)
    async find(@Param(BUSINESS_ID_PARAM) businessId: string, @Query() query: AvailabilityQueryDto): Promise<ApiResponse<AvailabilityResponseDto>> {
        const business = await this.businesses.getById(businessId);
        return ApiResponse.of(AvailabilityResponseDto.from(await this.availability.forTeam(business, query)));
    }
}

@ApiTags('public')
@IsPublic()
@Controller('/api/public/businesses')
export class PublicAvailabilityController {

    constructor(
        private readonly businesses: BusinessesService,
        private readonly availability: AvailabilityService,
    ) { }

    @Get(':slug/availability')
    @ApiOperation({
        summary: 'Horários livres',
        description: `${DESCRIPTION} Respeita a antecedência mínima e máxima do negócio; data passada ou fora da janela devolve \`slots\` vazio. Só serviços ativos.`,
    })
    @ApiParam({ name: 'slug', example: 'barbearia-do-joao' })
    @ApiDataResponse(AvailabilityResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, INVALID_QUERY)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, `Negócio inexistente ou inativo (\`BUSINESS_NOT_FOUND\`). ${NOT_FOUND}`)
    async find(@Param('slug') slug: string, @Query() query: AvailabilityQueryDto): Promise<ApiResponse<AvailabilityResponseDto>> {
        const business = await this.businesses.getActiveBySlug(slug);
        return ApiResponse.of(AvailabilityResponseDto.from(await this.availability.forCustomers(business, query)));
    }
}
