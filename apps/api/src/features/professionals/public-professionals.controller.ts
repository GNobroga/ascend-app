import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { IsPublic } from '../../common/auth/public.decorator.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { BusinessesService } from '../businesses/index.js';
import { PublicProfessionalDto, PublicProfessionalsQueryDto } from './dto/public-professional.dto.js';
import { ProfessionalsService } from './professionals.service.js';

@ApiTags('public')
@IsPublic()
@Controller('/api/public/businesses')
export class PublicProfessionalsController {

    constructor(
        private readonly businesses: BusinessesService,
        private readonly professionals: ProfessionalsService,
    ) { }

    @Get(':slug/professionals')
    @ApiOperation({ summary: 'Profissionais do negócio', description: 'Só negócios ativos e profissionais de membros ativos. Não expõe comissão nem dados da conta.' })
    @ApiParam({ name: 'slug', example: 'barbearia-do-joao' })
    @ApiDataResponse(PublicProfessionalDto, { isArray: true })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`serviceId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Negócio inexistente ou inativo (`BUSINESS_NOT_FOUND`).')
    async list(@Param('slug') slug: string, @Query() query: PublicProfessionalsQueryDto): Promise<ApiResponse<PublicProfessionalDto[]>> {
        const business = await this.businesses.getActiveBySlug(slug);
        const professionals = await this.professionals.listBookable(business.id, query.serviceId ? [query.serviceId] : []);
        return ApiResponse.of(professionals.map((p) => PublicProfessionalDto.from(p)));
    }
}
