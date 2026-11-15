import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { ReorderDto } from '../../common/http/reorder.dto.js';
import { UuidParam } from '../../common/pipes/uuid-param.decorator.js';
import { ImageUpload, UploadedImage } from '../../common/storage/image-upload.decorator.js';
import { BUSINESS_ID_PARAM, BusinessAccess } from '../businesses/index.js';
import { CreateServiceImageDto, ServiceImageResponseDto, UpdateServiceImageDto } from './dto/service-image.dto.js';
import { MAX_IMAGES_PER_SERVICE, ServiceImagesService } from './service-images.service.js';

const MANAGERS = [BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN];
const SERVICE_NOT_FOUND = 'Serviço não encontrado neste negócio (`SERVICE_NOT_FOUND`).';
const IMAGE_NOT_FOUND = `${SERVICE_NOT_FOUND} Imagem não encontrada neste serviço (\`SERVICE_IMAGE_NOT_FOUND\`).`;

@ApiTags('service-images')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/services/:serviceId/images`)
export class ServiceImagesController {

    constructor(private readonly images: ServiceImagesService) { }

    @Get()
    @BusinessAccess()
    @ApiOperation({ summary: 'Lista as imagens do serviço', description: 'Ordenadas por `displayOrder`.' })
    @ApiDataResponse(ServiceImageResponseDto, { isArray: true })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`serviceId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, SERVICE_NOT_FOUND)
    async list(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('serviceId') serviceId: string): Promise<ApiResponse<ServiceImageResponseDto[]>> {
        const images = await this.images.list(businessId, serviceId);
        return ApiResponse.of(images.map((i) => ServiceImageResponseDto.from(i)));
    }

    @Post()
    @BusinessAccess(...MANAGERS)
    @ImageUpload(CreateServiceImageDto)
    @ApiOperation({ summary: 'Envia uma imagem do serviço', description: `A imagem vai para o fim da ordem. Limite de ${MAX_IMAGES_PER_SERVICE} imagens por serviço.` })
    @ApiDataResponse(ServiceImageResponseDto, { status: HttpStatus.CREATED, description: 'Imagem criada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos, arquivo ausente ou `serviceId` não é UUID (`VALIDATION_ERROR`), ou arquivo que não é imagem (`INVALID_IMAGE`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, SERVICE_NOT_FOUND)
    @ApiErrorResponse(HttpStatus.CONFLICT, 'Limite de imagens do serviço atingido (`SERVICE_IMAGE_LIMIT_REACHED`).')
    async upload(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('serviceId') serviceId: string,
        @UploadedImage() file: Buffer,
        @Body() dto: CreateServiceImageDto,
    ): Promise<ApiResponse<ServiceImageResponseDto>> {
        return ApiResponse.of(ServiceImageResponseDto.from(await this.images.upload(businessId, serviceId, file, dto)));
    }

    @Put('order')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Reordena as imagens do serviço', description: 'Recebe todas as imagens do serviço na nova ordem.' })
    @ApiNoContentResponse({ description: 'Ordem gravada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou lista que não contém exatamente as imagens do serviço (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, SERVICE_NOT_FOUND)
    async reorder(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('serviceId') serviceId: string, @Body() dto: ReorderDto): Promise<void> {
        await this.images.reorder(businessId, serviceId, dto.ids);
    }

    @Patch(':imageId')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Atualiza o texto alternativo da imagem' })
    @ApiDataResponse(ServiceImageResponseDto, { description: 'Imagem atualizada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou id que não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, IMAGE_NOT_FOUND)
    async update(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('serviceId') serviceId: string,
        @UuidParam('imageId') imageId: string,
        @Body() dto: UpdateServiceImageDto,
    ): Promise<ApiResponse<ServiceImageResponseDto>> {
        return ApiResponse.of(ServiceImageResponseDto.from(await this.images.update(businessId, serviceId, imageId, dto)));
    }

    @Delete(':imageId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Exclui uma imagem do serviço', description: 'Remove o registro e o arquivo do storage.' })
    @ApiNoContentResponse({ description: 'Imagem excluída.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Id que não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, IMAGE_NOT_FOUND)
    async remove(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('serviceId') serviceId: string,
        @UuidParam('imageId') imageId: string,
    ): Promise<void> {
        await this.images.remove(businessId, serviceId, imageId);
    }
}
