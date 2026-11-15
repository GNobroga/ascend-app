import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { ReorderDto } from '../../common/http/reorder.dto.js';
import { UuidParam } from '../../common/pipes/uuid-param.decorator.js';
import { ImageUpload, UploadedImage } from '../../common/storage/image-upload.decorator.js';
import { BUSINESS_ID_PARAM, BusinessAccess } from '../businesses/index.js';
import { CreatePackageImageDto, PackageImageResponseDto, UpdatePackageImageDto } from './dto/package-image.dto.js';
import { MAX_IMAGES_PER_PACKAGE, PackageImagesService } from './package-images.service.js';

const MANAGERS = [BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN];
const PACKAGE_NOT_FOUND = 'Pacote não encontrado neste negócio (`PACKAGE_NOT_FOUND`).';
const IMAGE_NOT_FOUND = `${PACKAGE_NOT_FOUND} Imagem não encontrada neste pacote (\`PACKAGE_IMAGE_NOT_FOUND\`).`;

@ApiTags('package-images')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/packages/:packageId/images`)
export class PackageImagesController {

    constructor(private readonly images: PackageImagesService) { }

    @Get()
    @BusinessAccess()
    @ApiOperation({ summary: 'Lista as imagens do pacote', description: 'Ordenadas por `displayOrder`.' })
    @ApiDataResponse(PackageImageResponseDto, { isArray: true })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`packageId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PACKAGE_NOT_FOUND)
    async list(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('packageId') packageId: string): Promise<ApiResponse<PackageImageResponseDto[]>> {
        const images = await this.images.list(businessId, packageId);
        return ApiResponse.of(images.map((i) => PackageImageResponseDto.from(i)));
    }

    @Post()
    @BusinessAccess(...MANAGERS)
    @ImageUpload(CreatePackageImageDto)
    @ApiOperation({ summary: 'Envia uma imagem do pacote', description: `A imagem vai para o fim da ordem. Limite de ${MAX_IMAGES_PER_PACKAGE} imagens por pacote.` })
    @ApiDataResponse(PackageImageResponseDto, { status: HttpStatus.CREATED, description: 'Imagem criada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos, arquivo ausente ou `packageId` não é UUID (`VALIDATION_ERROR`), ou arquivo que não é imagem (`INVALID_IMAGE`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PACKAGE_NOT_FOUND)
    @ApiErrorResponse(HttpStatus.CONFLICT, 'Limite de imagens do pacote atingido (`PACKAGE_IMAGE_LIMIT_REACHED`).')
    async upload(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('packageId') packageId: string,
        @UploadedImage() file: Buffer,
        @Body() dto: CreatePackageImageDto,
    ): Promise<ApiResponse<PackageImageResponseDto>> {
        return ApiResponse.of(PackageImageResponseDto.from(await this.images.upload(businessId, packageId, file, dto)));
    }

    @Put('order')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Reordena as imagens do pacote', description: 'Recebe todas as imagens do pacote na nova ordem.' })
    @ApiNoContentResponse({ description: 'Ordem gravada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou lista que não contém exatamente as imagens do pacote (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PACKAGE_NOT_FOUND)
    async reorder(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('packageId') packageId: string, @Body() dto: ReorderDto): Promise<void> {
        await this.images.reorder(businessId, packageId, dto.ids);
    }

    @Patch(':imageId')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Atualiza o texto alternativo da imagem' })
    @ApiDataResponse(PackageImageResponseDto, { description: 'Imagem atualizada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou id que não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, IMAGE_NOT_FOUND)
    async update(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('packageId') packageId: string,
        @UuidParam('imageId') imageId: string,
        @Body() dto: UpdatePackageImageDto,
    ): Promise<ApiResponse<PackageImageResponseDto>> {
        return ApiResponse.of(PackageImageResponseDto.from(await this.images.update(businessId, packageId, imageId, dto)));
    }

    @Delete(':imageId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Exclui uma imagem do pacote', description: 'Remove o registro e o arquivo do storage.' })
    @ApiNoContentResponse({ description: 'Imagem excluída.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Id que não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, IMAGE_NOT_FOUND)
    async remove(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('packageId') packageId: string,
        @UuidParam('imageId') imageId: string,
    ): Promise<void> {
        await this.images.remove(businessId, packageId, imageId);
    }
}
