import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { UuidParam } from '../../common/pipes/uuid-param.decorator.js';
import { BUSINESS_ID_PARAM, BusinessAccess } from '../businesses/index.js';
import { ServiceListQueryDto } from './dto/catalog-list-query.dto.js';
import { ReorderDto } from '../../common/http/reorder.dto.js';
import { CreateServiceDto, ServiceResponseDto, UpdateServiceDto } from './dto/service.dto.js';
import { ServicesService } from './services.service.js';

const MANAGERS = [BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN];

@ApiTags('services')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/services`)
export class ServicesController {

    constructor(private readonly services: ServicesService) { }

    @Get()
    @BusinessAccess()
    @ApiOperation({ summary: 'Lista os serviços', description: 'Ordenados por `displayOrder` e nome.' })
    @ApiDataResponse(ServiceResponseDto, { isArray: true })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Query inválida (`VALIDATION_ERROR`).')
    async list(@Param(BUSINESS_ID_PARAM) businessId: string, @Query() query: ServiceListQueryDto): Promise<ApiResponse<ServiceResponseDto[]>> {
        const services = await this.services.list(businessId, query, { withImages: true });
        return ApiResponse.of(services.map((s) => ServiceResponseDto.from(s)));
    }

    @Post()
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Cria um serviço' })
    @ApiDataResponse(ServiceResponseDto, { status: HttpStatus.CREATED, description: 'Serviço criado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Categoria não encontrada neste negócio (`SERVICE_CATEGORY_NOT_FOUND`).')
    async create(@Param(BUSINESS_ID_PARAM) businessId: string, @Body() dto: CreateServiceDto): Promise<ApiResponse<ServiceResponseDto>> {
        return ApiResponse.of(ServiceResponseDto.from(await this.services.create(businessId, dto)));
    }

    @Put('order')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Reordena os serviços', description: 'Recebe todos os serviços do negócio na nova ordem.' })
    @ApiNoContentResponse({ description: 'Ordem gravada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou lista que não contém exatamente os serviços do negócio (`VALIDATION_ERROR`).')
    async reorder(@Param(BUSINESS_ID_PARAM) businessId: string, @Body() dto: ReorderDto): Promise<void> {
        await this.services.reorder(businessId, dto.ids);
    }

    @Get(':serviceId')
    @BusinessAccess()
    @ApiOperation({ summary: 'Detalhes do serviço' })
    @ApiDataResponse(ServiceResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`serviceId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Serviço não encontrado neste negócio (`SERVICE_NOT_FOUND`).')
    async findOne(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('serviceId') serviceId: string): Promise<ApiResponse<ServiceResponseDto>> {
        return ApiResponse.of(ServiceResponseDto.from(await this.services.getById(businessId, serviceId)));
    }

    @Patch(':serviceId')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Atualiza um serviço', description: 'Só os campos enviados são alterados.' })
    @ApiDataResponse(ServiceResponseDto, { description: 'Serviço atualizado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou `serviceId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Serviço (`SERVICE_NOT_FOUND`) ou categoria (`SERVICE_CATEGORY_NOT_FOUND`) não encontrados neste negócio.')
    async update(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('serviceId') serviceId: string,
        @Body() dto: UpdateServiceDto,
    ): Promise<ApiResponse<ServiceResponseDto>> {
        return ApiResponse.of(ServiceResponseDto.from(await this.services.update(businessId, serviceId, dto)));
    }

    @Delete(':serviceId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Exclui um serviço', description: 'Exclusão lógica; agendamentos passados continuam apontando para ele.' })
    @ApiNoContentResponse({ description: 'Serviço excluído.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`serviceId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Serviço não encontrado neste negócio (`SERVICE_NOT_FOUND`).')
    async remove(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('serviceId') serviceId: string): Promise<void> {
        await this.services.remove(businessId, serviceId);
    }
}
