import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { UuidParam } from '../../common/pipes/uuid-param.decorator.js';
import { BUSINESS_ID_PARAM, BusinessAccess } from '../businesses/index.js';
import { CreateSpecialtyDto, SpecialtyResponseDto, UpdateSpecialtyDto } from './dto/specialty.dto.js';
import { SpecialtiesService } from './specialties.service.js';

const MANAGERS = [BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN];
const SPECIALTY_NOT_FOUND = 'Especialidade não encontrada neste negócio (`SPECIALTY_NOT_FOUND`).';
const NAME_IN_USE = 'Já existe especialidade com este nome (`SPECIALTY_NAME_IN_USE`).';

@ApiTags('specialties')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/specialties`)
export class SpecialtiesController {

    constructor(private readonly specialties: SpecialtiesService) { }

    @Get()
    @BusinessAccess()
    @ApiOperation({ summary: 'Lista as especialidades', description: 'Ordenadas por nome.' })
    @ApiDataResponse(SpecialtyResponseDto, { isArray: true })
    async list(@Param(BUSINESS_ID_PARAM) businessId: string): Promise<ApiResponse<SpecialtyResponseDto[]>> {
        const specialties = await this.specialties.list(businessId);
        return ApiResponse.of(specialties.map((s) => SpecialtyResponseDto.from(s)));
    }

    @Post()
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Cria uma especialidade' })
    @ApiDataResponse(SpecialtyResponseDto, { status: HttpStatus.CREATED, description: 'Especialidade criada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.CONFLICT, NAME_IN_USE)
    async create(@Param(BUSINESS_ID_PARAM) businessId: string, @Body() dto: CreateSpecialtyDto): Promise<ApiResponse<SpecialtyResponseDto>> {
        return ApiResponse.of(SpecialtyResponseDto.from(await this.specialties.create(businessId, dto)));
    }

    @Patch(':specialtyId')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Atualiza uma especialidade', description: 'Só os campos enviados são alterados.' })
    @ApiDataResponse(SpecialtyResponseDto, { description: 'Especialidade atualizada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou `specialtyId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, SPECIALTY_NOT_FOUND)
    @ApiErrorResponse(HttpStatus.CONFLICT, NAME_IN_USE)
    async update(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('specialtyId') specialtyId: string,
        @Body() dto: UpdateSpecialtyDto,
    ): Promise<ApiResponse<SpecialtyResponseDto>> {
        return ApiResponse.of(SpecialtyResponseDto.from(await this.specialties.update(businessId, specialtyId, dto)));
    }

    @Delete(':specialtyId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Exclui uma especialidade', description: 'Exclusão definitiva; os profissionais perdem a especialidade.' })
    @ApiNoContentResponse({ description: 'Especialidade excluída.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`specialtyId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, SPECIALTY_NOT_FOUND)
    async remove(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('specialtyId') specialtyId: string): Promise<void> {
        await this.specialties.remove(businessId, specialtyId);
    }
}
