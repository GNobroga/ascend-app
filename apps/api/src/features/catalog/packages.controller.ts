import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { ReorderDto } from '../../common/http/reorder.dto.js';
import { UuidParam } from '../../common/pipes/uuid-param.decorator.js';
import { BUSINESS_ID_PARAM, BusinessAccess } from '../businesses/index.js';
import { CreatePackageDto, PackageListQueryDto, PackageResponseDto, UpdatePackageDto } from './dto/package.dto.js';
import { PackagesService } from './packages.service.js';

const MANAGERS = [BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN];
const PACKAGE_NOT_FOUND = 'Pacote não encontrado neste negócio (`PACKAGE_NOT_FOUND`).';
const SERVICE_NOT_FOUND = 'Serviço não encontrado neste negócio (`SERVICE_NOT_FOUND`).';

@ApiTags('packages')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/packages`)
export class PackagesController {

    constructor(private readonly packages: PackagesService) { }

    @Get()
    @BusinessAccess()
    @ApiOperation({ summary: 'Lista os pacotes', description: 'Ordenados por `displayOrder` e nome.' })
    @ApiDataResponse(PackageResponseDto, { isArray: true })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Query inválida (`VALIDATION_ERROR`).')
    async list(@Param(BUSINESS_ID_PARAM) businessId: string, @Query() query: PackageListQueryDto): Promise<ApiResponse<PackageResponseDto[]>> {
        const packages = await this.packages.list(businessId, query);
        return ApiResponse.of(packages.map((p) => PackageResponseDto.from(p)));
    }

    @Post()
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Cria um pacote', description: 'Para ser agendado, o pacote precisa de profissionais ligados (`PUT /professionals/:id/packages`).' })
    @ApiDataResponse(PackageResponseDto, { status: HttpStatus.CREATED, description: 'Pacote criado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, SERVICE_NOT_FOUND)
    async create(@Param(BUSINESS_ID_PARAM) businessId: string, @Body() dto: CreatePackageDto): Promise<ApiResponse<PackageResponseDto>> {
        return ApiResponse.of(PackageResponseDto.from(await this.packages.create(businessId, dto)));
    }

    @Put('order')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Reordena os pacotes', description: 'Recebe todos os pacotes do negócio na nova ordem.' })
    @ApiNoContentResponse({ description: 'Ordem gravada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou lista que não contém exatamente os pacotes do negócio (`VALIDATION_ERROR`).')
    async reorder(@Param(BUSINESS_ID_PARAM) businessId: string, @Body() dto: ReorderDto): Promise<void> {
        await this.packages.reorder(businessId, dto.ids);
    }

    @Get(':packageId')
    @BusinessAccess()
    @ApiOperation({ summary: 'Detalhes do pacote' })
    @ApiDataResponse(PackageResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`packageId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PACKAGE_NOT_FOUND)
    async findOne(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('packageId') packageId: string): Promise<ApiResponse<PackageResponseDto>> {
        return ApiResponse.of(PackageResponseDto.from(await this.packages.getById(businessId, packageId)));
    }

    @Patch(':packageId')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Atualiza um pacote', description: 'Só os campos enviados são alterados; `serviceIds` substitui a lista inteira. Agendamentos já feitos mantêm os valores da reserva.' })
    @ApiDataResponse(PackageResponseDto, { description: 'Pacote atualizado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou `packageId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, `${PACKAGE_NOT_FOUND} ${SERVICE_NOT_FOUND}`)
    async update(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('packageId') packageId: string,
        @Body() dto: UpdatePackageDto,
    ): Promise<ApiResponse<PackageResponseDto>> {
        return ApiResponse.of(PackageResponseDto.from(await this.packages.update(businessId, packageId, dto)));
    }

    @Delete(':packageId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Exclui um pacote', description: 'Exclusão lógica; agendamentos passados continuam apontando para ele.' })
    @ApiNoContentResponse({ description: 'Pacote excluído.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`packageId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PACKAGE_NOT_FOUND)
    async remove(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('packageId') packageId: string): Promise<void> {
        await this.packages.remove(businessId, packageId);
    }
}
