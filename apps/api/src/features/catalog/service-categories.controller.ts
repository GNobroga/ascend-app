import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { UuidParam } from '../../common/pipes/uuid-param.decorator.js';
import { BUSINESS_ID_PARAM, BusinessAccess } from '../businesses/index.js';
import { ServiceCategoryListQueryDto } from './dto/catalog-list-query.dto.js';
import { ReorderDto } from '../../common/http/reorder.dto.js';
import { CreateServiceCategoryDto, ServiceCategoryResponseDto, UpdateServiceCategoryDto } from './dto/service-category.dto.js';
import { ServiceCategoriesService } from './service-categories.service.js';

const MANAGERS = [BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN];

@ApiTags('service-categories')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/service-categories`)
export class ServiceCategoriesController {

    constructor(private readonly categories: ServiceCategoriesService) { }

    @Get()
    @BusinessAccess()
    @ApiOperation({ summary: 'Lista as categorias', description: 'Ordenadas por `displayOrder` e nome.' })
    @ApiDataResponse(ServiceCategoryResponseDto, { isArray: true })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Query inválida (`VALIDATION_ERROR`).')
    async list(@Param(BUSINESS_ID_PARAM) businessId: string, @Query() query: ServiceCategoryListQueryDto): Promise<ApiResponse<ServiceCategoryResponseDto[]>> {
        const categories = await this.categories.list(businessId, query);
        return ApiResponse.of(categories.map((c) => ServiceCategoryResponseDto.from(c)));
    }

    @Post()
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Cria uma categoria' })
    @ApiDataResponse(ServiceCategoryResponseDto, { status: HttpStatus.CREATED, description: 'Categoria criada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos (`VALIDATION_ERROR`).')
    async create(@Param(BUSINESS_ID_PARAM) businessId: string, @Body() dto: CreateServiceCategoryDto): Promise<ApiResponse<ServiceCategoryResponseDto>> {
        return ApiResponse.of(ServiceCategoryResponseDto.from(await this.categories.create(businessId, dto)));
    }

    @Put('order')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Reordena as categorias', description: 'Recebe todas as categorias do negócio na nova ordem.' })
    @ApiNoContentResponse({ description: 'Ordem gravada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou lista que não contém exatamente as categorias do negócio (`VALIDATION_ERROR`).')
    async reorder(@Param(BUSINESS_ID_PARAM) businessId: string, @Body() dto: ReorderDto): Promise<void> {
        await this.categories.reorder(businessId, dto.ids);
    }

    @Patch(':categoryId')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Atualiza uma categoria', description: 'Só os campos enviados são alterados.' })
    @ApiDataResponse(ServiceCategoryResponseDto, { description: 'Categoria atualizada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou `categoryId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Categoria não encontrada neste negócio (`SERVICE_CATEGORY_NOT_FOUND`).')
    async update(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('categoryId') categoryId: string,
        @Body() dto: UpdateServiceCategoryDto,
    ): Promise<ApiResponse<ServiceCategoryResponseDto>> {
        return ApiResponse.of(ServiceCategoryResponseDto.from(await this.categories.update(businessId, categoryId, dto)));
    }

    @Delete(':categoryId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Exclui uma categoria', description: 'Exclusão lógica. Os serviços da categoria continuam existindo, sem categoria.' })
    @ApiNoContentResponse({ description: 'Categoria excluída.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`categoryId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Categoria não encontrada neste negócio (`SERVICE_CATEGORY_NOT_FOUND`).')
    async remove(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('categoryId') categoryId: string): Promise<void> {
        await this.categories.remove(businessId, categoryId);
    }
}
