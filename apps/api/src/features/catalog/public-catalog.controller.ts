import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { IsPublic } from '../../common/auth/public.decorator.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { PublicCatalogResponseDto } from './dto/public-catalog-response.dto.js';
import { PublicCatalogService } from './public-catalog.service.js';

@ApiTags('public')
@IsPublic()
@Controller('/api/public/businesses')
export class PublicCatalogController {

    constructor(private readonly catalog: PublicCatalogService) { }

    @Get(':slug/services')
    @ApiOperation({ summary: 'Catálogo público do negócio', description: 'Só serviços ativos. Serviços de categorias inativas ficam de fora; categorias sem serviço ativo não aparecem. Pacotes aparecem só se estiverem ativos e com todos os serviços ativos.' })
    @ApiParam({ name: 'slug', example: 'barbearia-do-joao' })
    @ApiDataResponse(PublicCatalogResponseDto)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Negócio inexistente ou inativo (`BUSINESS_NOT_FOUND`).')
    async findBySlug(@Param('slug') slug: string): Promise<ApiResponse<PublicCatalogResponseDto>> {
        return ApiResponse.of(await this.catalog.getBySlug(slug));
    }
}
