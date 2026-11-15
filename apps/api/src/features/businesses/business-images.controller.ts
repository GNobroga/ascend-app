import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { ReorderDto } from '../../common/http/reorder.dto.js';
import { UuidParam } from '../../common/pipes/uuid-param.decorator.js';
import { ImageUpload, UploadedImage } from '../../common/storage/image-upload.decorator.js';
import { BusinessAccess } from './business-access.decorator.js';
import { MAX_IMAGES_PER_BUSINESS, BusinessImagesService } from './business-images.service.js';
import { BUSINESS_ID_PARAM } from './business-membership.js';
import { BusinessImageResponseDto, CreateBusinessImageDto, UpdateBusinessImageDto } from './dto/business-image.dto.js';

const MANAGERS = [BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN];

@ApiTags('business-images')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/images`)
export class BusinessImagesController {

    constructor(private readonly images: BusinessImagesService) { }

    @Get()
    @BusinessAccess()
    @ApiOperation({ summary: 'Lista as imagens', description: 'Ordenadas por `displayOrder`.' })
    @ApiDataResponse(BusinessImageResponseDto, { isArray: true })
    async list(@Param(BUSINESS_ID_PARAM) businessId: string): Promise<ApiResponse<BusinessImageResponseDto[]>> {
        const images = await this.images.list(businessId);
        return ApiResponse.of(images.map((i) => BusinessImageResponseDto.from(i)));
    }

    @Post()
    @BusinessAccess(...MANAGERS)
    @ImageUpload(CreateBusinessImageDto)
    @ApiOperation({
        summary: 'Envia uma imagem',
        description: `A imagem vai para o fim da ordem. Limite de ${MAX_IMAGES_PER_BUSINESS} imagens por negócio. Enviar uma \`cover\` rebaixa a anterior para \`gallery\`.`,
    })
    @ApiDataResponse(BusinessImageResponseDto, { status: HttpStatus.CREATED, description: 'Imagem criada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou arquivo ausente (`VALIDATION_ERROR`), ou arquivo que não é imagem (`INVALID_IMAGE`).')
    @ApiErrorResponse(HttpStatus.CONFLICT, 'Limite de imagens do negócio atingido (`BUSINESS_IMAGE_LIMIT_REACHED`).')
    async upload(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UploadedImage() file: Buffer,
        @Body() dto: CreateBusinessImageDto,
    ): Promise<ApiResponse<BusinessImageResponseDto>> {
        return ApiResponse.of(BusinessImageResponseDto.from(await this.images.upload(businessId, file, dto)));
    }

    @Put('order')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Reordena as imagens', description: 'Recebe todas as imagens do negócio na nova ordem.' })
    @ApiNoContentResponse({ description: 'Ordem gravada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou lista que não contém exatamente as imagens do negócio (`VALIDATION_ERROR`).')
    async reorder(@Param(BUSINESS_ID_PARAM) businessId: string, @Body() dto: ReorderDto): Promise<void> {
        await this.images.reorder(businessId, dto.ids);
    }

    @Patch(':imageId')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Atualiza uma imagem', description: 'Só os campos enviados são alterados. Tornar a imagem `cover` rebaixa a anterior para `gallery`.' })
    @ApiDataResponse(BusinessImageResponseDto, { description: 'Imagem atualizada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou `imageId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Imagem não encontrada neste negócio (`BUSINESS_IMAGE_NOT_FOUND`).')
    async update(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('imageId') imageId: string,
        @Body() dto: UpdateBusinessImageDto,
    ): Promise<ApiResponse<BusinessImageResponseDto>> {
        return ApiResponse.of(BusinessImageResponseDto.from(await this.images.update(businessId, imageId, dto)));
    }

    @Delete(':imageId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Exclui uma imagem', description: 'Remove o registro e o arquivo do storage.' })
    @ApiNoContentResponse({ description: 'Imagem excluída.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`imageId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Imagem não encontrada neste negócio (`BUSINESS_IMAGE_NOT_FOUND`).')
    async remove(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('imageId') imageId: string): Promise<void> {
        await this.images.remove(businessId, imageId);
    }
}
