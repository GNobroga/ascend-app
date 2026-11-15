import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { UuidParam } from '../../common/pipes/uuid-param.decorator.js';
import { BUSINESS_ID_PARAM, BusinessAccess } from '../businesses/index.js';
import {
    CreateProfessionalTimeOffDto,
    ProfessionalTimeOffQueryDto,
    ProfessionalTimeOffResponseDto,
    UpdateProfessionalTimeOffDto,
} from './dto/professional-time-off.dto.js';
import { ProfessionalTimeOffsService } from './professional-time-offs.service.js';

const MANAGERS = [BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN];
const PROFESSIONAL_NOT_FOUND = 'Profissional não encontrado neste negócio (`PROFESSIONAL_NOT_FOUND`).';
const TIME_OFF_NOT_FOUND = `${PROFESSIONAL_NOT_FOUND} Ausência não encontrada (\`TIME_OFF_NOT_FOUND\`).`;
const OVERLAP = 'Sobrepõe outra ausência do profissional (`TIME_OFF_OVERLAP`) ou agendamentos que ocupam a agenda (`TIME_OFF_CONFLICTS_WITH_APPOINTMENTS`).';

@ApiTags('professional-time-offs')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/professionals/:professionalId/time-offs`)
export class ProfessionalTimeOffsController {

    constructor(private readonly timeOffs: ProfessionalTimeOffsService) { }

    @Get()
    @BusinessAccess()
    @ApiOperation({ summary: 'Lista as ausências', description: 'Ordenadas por início. `from`/`to` trazem só as que tocam o intervalo.' })
    @ApiDataResponse(ProfessionalTimeOffResponseDto, { isArray: true })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Query inválida ou `professionalId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PROFESSIONAL_NOT_FOUND)
    async list(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('professionalId') professionalId: string,
        @Query() query: ProfessionalTimeOffQueryDto,
    ): Promise<ApiResponse<ProfessionalTimeOffResponseDto[]>> {
        const timeOffs = await this.timeOffs.list(businessId, professionalId, query);
        return ApiResponse.of(timeOffs.map((t) => ProfessionalTimeOffResponseDto.from(t)));
    }

    @Post()
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Registra uma ausência' })
    @ApiDataResponse(ProfessionalTimeOffResponseDto, { status: HttpStatus.CREATED, description: 'Ausência criada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos, fim antes do início ou `professionalId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PROFESSIONAL_NOT_FOUND)
    @ApiErrorResponse(HttpStatus.CONFLICT, OVERLAP)
    async create(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('professionalId') professionalId: string,
        @Body() dto: CreateProfessionalTimeOffDto,
    ): Promise<ApiResponse<ProfessionalTimeOffResponseDto>> {
        return ApiResponse.of(ProfessionalTimeOffResponseDto.from(await this.timeOffs.create(businessId, professionalId, dto)));
    }

    @Patch(':timeOffId')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Atualiza uma ausência', description: 'Só os campos enviados são alterados.' })
    @ApiDataResponse(ProfessionalTimeOffResponseDto, { description: 'Ausência atualizada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos, fim antes do início ou id que não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, TIME_OFF_NOT_FOUND)
    @ApiErrorResponse(HttpStatus.CONFLICT, OVERLAP)
    async update(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('professionalId') professionalId: string,
        @UuidParam('timeOffId') timeOffId: string,
        @Body() dto: UpdateProfessionalTimeOffDto,
    ): Promise<ApiResponse<ProfessionalTimeOffResponseDto>> {
        return ApiResponse.of(ProfessionalTimeOffResponseDto.from(await this.timeOffs.update(businessId, professionalId, timeOffId, dto)));
    }

    @Delete(':timeOffId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Exclui uma ausência' })
    @ApiNoContentResponse({ description: 'Ausência excluída.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Id que não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, TIME_OFF_NOT_FOUND)
    async remove(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('professionalId') professionalId: string,
        @UuidParam('timeOffId') timeOffId: string,
    ): Promise<void> {
        await this.timeOffs.remove(businessId, professionalId, timeOffId);
    }
}
