import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { IsPublic } from '../../common/auth/public.decorator.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { BusinessSubscriptionsService } from './business-subscriptions.service.js';
import { BusinessesService } from './businesses.service.js';
import { PublicBusinessResponseDto } from './dto/public-business-response.dto.js';

@ApiTags('public')
@IsPublic()
@Controller('/api/public/businesses')
export class PublicBusinessesController {

    constructor(
        private readonly businesses: BusinessesService,
        private readonly subscriptions: BusinessSubscriptionsService,
    ) { }

    @Get(':slug')
    @ApiOperation({ summary: 'Página pública do negócio', description: 'Só negócios ativos. Não expõe CPF/CNPJ.' })
    @ApiParam({ name: 'slug', example: 'barbearia-do-joao' })
    @ApiDataResponse(PublicBusinessResponseDto)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Negócio inexistente ou inativo (`BUSINESS_NOT_FOUND`).')
    async findBySlug(@Param('slug') slug: string): Promise<ApiResponse<PublicBusinessResponseDto>> {
        const business = await this.businesses.getPublicBySlug(slug);
        return ApiResponse.of(PublicBusinessResponseDto.from(business, await this.subscriptions.hasFullAccess(business.id)));
    }
}
