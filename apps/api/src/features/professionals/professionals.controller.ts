import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { UuidParam } from '../../common/pipes/uuid-param.decorator.js';
import { ImageUpload, UploadedImage } from '../../common/storage/image-upload.decorator.js';
import { BUSINESS_ID_PARAM, BusinessAccess } from '../businesses/index.js';
import {
    CreateProfessionalDto,
    ProfessionalResponseDto,
    SetProfessionalPackagesDto,
    SetProfessionalServicesDto,
    SetProfessionalSpecialtiesDto,
    UpdateProfessionalDto,
} from './dto/professional.dto.js';
import { ProfessionalWorkingHourDto, SetProfessionalWorkingHoursDto } from './dto/professional-working-hours.dto.js';
import { ProfessionalWorkingHoursService } from './professional-working-hours.service.js';
import { ProfessionalsService } from './professionals.service.js';

const MANAGERS = [BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN];
const PROFESSIONAL_NOT_FOUND = 'Profissional não encontrado neste negócio (`PROFESSIONAL_NOT_FOUND`).';
const INVALID_ID = '`professionalId` não é UUID (`VALIDATION_ERROR`).';
const INVALID_BODY = 'Dados inválidos ou `professionalId` não é UUID (`VALIDATION_ERROR`).';

@ApiTags('professionals')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/professionals`)
export class ProfessionalsController {

    constructor(
        private readonly professionals: ProfessionalsService,
        private readonly workingHours: ProfessionalWorkingHoursService,
    ) { }

    @Get()
    @BusinessAccess()
    @ApiOperation({ summary: 'Lista os profissionais', description: 'Inclui profissionais de membros suspensos (veja `memberStatus`); ordenados por nome.' })
    @ApiDataResponse(ProfessionalResponseDto, { isArray: true })
    async list(@Param(BUSINESS_ID_PARAM) businessId: string): Promise<ApiResponse<ProfessionalResponseDto[]>> {
        const professionals = await this.professionals.list(businessId);
        return ApiResponse.of(professionals.map((p) => ProfessionalResponseDto.from(p)));
    }

    @Post()
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Cria o perfil de profissional de um membro', description: 'Se o membro já teve um perfil removido, ele é restaurado com os novos dados.' })
    @ApiDataResponse(ProfessionalResponseDto, { status: HttpStatus.CREATED, description: 'Profissional criado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Membro não encontrado neste negócio (`MEMBER_NOT_FOUND`).')
    @ApiErrorResponse(HttpStatus.CONFLICT, 'O membro já tem perfil de profissional (`PROFESSIONAL_ALREADY_EXISTS`).')
    async create(@Param(BUSINESS_ID_PARAM) businessId: string, @Body() dto: CreateProfessionalDto): Promise<ApiResponse<ProfessionalResponseDto>> {
        return ApiResponse.of(ProfessionalResponseDto.from(await this.professionals.create(businessId, dto)));
    }

    @Get(':professionalId')
    @BusinessAccess()
    @ApiOperation({ summary: 'Detalhes do profissional' })
    @ApiDataResponse(ProfessionalResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, INVALID_ID)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PROFESSIONAL_NOT_FOUND)
    async findOne(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('professionalId') professionalId: string,
    ): Promise<ApiResponse<ProfessionalResponseDto>> {
        return ApiResponse.of(ProfessionalResponseDto.from(await this.professionals.getById(businessId, professionalId)));
    }

    @Patch(':professionalId')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Atualiza o perfil do profissional', description: 'Só os campos enviados são alterados.' })
    @ApiDataResponse(ProfessionalResponseDto, { description: 'Profissional atualizado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, INVALID_BODY)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PROFESSIONAL_NOT_FOUND)
    async update(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('professionalId') professionalId: string,
        @Body() dto: UpdateProfessionalDto,
    ): Promise<ApiResponse<ProfessionalResponseDto>> {
        return ApiResponse.of(ProfessionalResponseDto.from(await this.professionals.update(businessId, professionalId, dto)));
    }

    @Delete(':professionalId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Remove o perfil do profissional', description: 'Exclusão lógica; o membro continua no negócio.' })
    @ApiNoContentResponse({ description: 'Profissional removido.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, INVALID_ID)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PROFESSIONAL_NOT_FOUND)
    async remove(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('professionalId') professionalId: string): Promise<void> {
        await this.professionals.remove(businessId, professionalId);
    }

    @Put(':professionalId/photo')
    @BusinessAccess(...MANAGERS)
    @ImageUpload()
    @ApiOperation({ summary: 'Define a foto do profissional', description: 'Substitui a foto atual, cujo arquivo é removido do storage.' })
    @ApiDataResponse(ProfessionalResponseDto, { description: 'Profissional com o novo `photoUrl`.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Arquivo ausente ou `professionalId` não é UUID (`VALIDATION_ERROR`), ou arquivo que não é imagem (`INVALID_IMAGE`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PROFESSIONAL_NOT_FOUND)
    async setPhoto(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('professionalId') professionalId: string,
        @UploadedImage() file: Buffer,
    ): Promise<ApiResponse<ProfessionalResponseDto>> {
        return ApiResponse.of(ProfessionalResponseDto.from(await this.professionals.setPhoto(businessId, professionalId, file)));
    }

    @Delete(':professionalId/photo')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Remove a foto do profissional', description: 'Remove também o arquivo do storage. Sem foto, não faz nada.' })
    @ApiNoContentResponse({ description: 'Foto removida.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, INVALID_ID)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PROFESSIONAL_NOT_FOUND)
    async removePhoto(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('professionalId') professionalId: string): Promise<void> {
        await this.professionals.removePhoto(businessId, professionalId);
    }

    @Put(':professionalId/services')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Define os serviços do profissional', description: 'Substitui a lista inteira; lista vazia remove todos.' })
    @ApiDataResponse(ProfessionalResponseDto, { description: 'Profissional com os serviços gravados.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos, serviço repetido ou `professionalId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, `${PROFESSIONAL_NOT_FOUND} Serviço não encontrado neste negócio (\`SERVICE_NOT_FOUND\`).`)
    async setServices(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('professionalId') professionalId: string,
        @Body() dto: SetProfessionalServicesDto,
    ): Promise<ApiResponse<ProfessionalResponseDto>> {
        return ApiResponse.of(ProfessionalResponseDto.from(await this.professionals.replaceServices(businessId, professionalId, dto.services)));
    }

    @Put(':professionalId/packages')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Define os pacotes do profissional', description: 'Substitui a lista inteira; lista vazia remove todos. Só profissionais ligados atendem o pacote.' })
    @ApiDataResponse(ProfessionalResponseDto, { description: 'Profissional com os pacotes gravados.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos, pacote repetido ou `professionalId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, `${PROFESSIONAL_NOT_FOUND} Pacote não encontrado neste negócio (\`PACKAGE_NOT_FOUND\`).`)
    async setPackages(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('professionalId') professionalId: string,
        @Body() dto: SetProfessionalPackagesDto,
    ): Promise<ApiResponse<ProfessionalResponseDto>> {
        return ApiResponse.of(ProfessionalResponseDto.from(await this.professionals.replacePackages(businessId, professionalId, dto.packages)));
    }

    @Put(':professionalId/specialties')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Define as especialidades do profissional', description: 'Substitui a lista inteira; lista vazia remove todas.' })
    @ApiDataResponse(ProfessionalResponseDto, { description: 'Profissional com as especialidades gravadas.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos, especialidade repetida ou `professionalId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, `${PROFESSIONAL_NOT_FOUND} Especialidade não encontrada neste negócio (\`SPECIALTY_NOT_FOUND\`).`)
    async setSpecialties(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('professionalId') professionalId: string,
        @Body() dto: SetProfessionalSpecialtiesDto,
    ): Promise<ApiResponse<ProfessionalResponseDto>> {
        return ApiResponse.of(ProfessionalResponseDto.from(await this.professionals.replaceSpecialties(businessId, professionalId, dto.specialtyIds)));
    }

    @Get(':professionalId/working-hours')
    @BusinessAccess()
    @ApiOperation({ summary: 'Horário de trabalho', description: 'Ordenado por dia da semana; vazio se ainda não configurado.' })
    @ApiDataResponse(ProfessionalWorkingHourDto, { isArray: true })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, INVALID_ID)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PROFESSIONAL_NOT_FOUND)
    async getWorkingHours(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('professionalId') professionalId: string,
    ): Promise<ApiResponse<ProfessionalWorkingHourDto[]>> {
        const hours = await this.workingHours.findByProfessional(businessId, professionalId);
        return ApiResponse.of(hours.map((h) => ProfessionalWorkingHourDto.from(h)));
    }

    @Put(':professionalId/working-hours')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({
        summary: 'Define o horário de trabalho',
        description: 'Substitui a semana inteira; os 7 dias são obrigatórios. Com o horário do negócio configurado, cada expediente precisa caber nele e dia fechado só aceita folga.',
    })
    @ApiDataResponse(ProfessionalWorkingHourDto, { isArray: true, description: 'Semana gravada, ordenada por dia.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos, dia repetido, fim antes do início, fora do horário do negócio ou `professionalId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PROFESSIONAL_NOT_FOUND)
    async setWorkingHours(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('professionalId') professionalId: string,
        @Body() dto: SetProfessionalWorkingHoursDto,
    ): Promise<ApiResponse<ProfessionalWorkingHourDto[]>> {
        const hours = await this.workingHours.replaceWeek(businessId, professionalId, dto.workingHours);
        return ApiResponse.of(hours.map((h) => ProfessionalWorkingHourDto.from(h)));
    }
}
