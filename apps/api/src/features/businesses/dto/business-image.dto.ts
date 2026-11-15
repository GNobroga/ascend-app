import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { BusinessImageType } from '../../../common/enums/business-image-type.enum.js';
import { ImageUploadDto } from '../../../common/storage/image-upload.decorator.js';
import { storageUrl } from '../../../common/storage/storage-url.js';
import { IsOptionalNotNull } from '../../../common/validation/is-optional-not-null.decorator.js';
import type { BusinessImageEntity } from '../../../database/entities/business-image.entity.js';

const TYPE_DESCRIPTION = 'Finalidade da imagem. Só há uma `cover` por negócio: definir outra rebaixa a anterior para `gallery`.';

export class CreateBusinessImageDto extends ImageUploadDto {
    @ApiPropertyOptional({ description: TYPE_DESCRIPTION, enum: Object.values(BusinessImageType), default: BusinessImageType.GALLERY })
    @IsOptionalNotNull()
    @IsIn(Object.values(BusinessImageType))
    type?: BusinessImageType;

    @ApiPropertyOptional({ maxLength: 255, example: 'Fachada da barbearia' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    altText?: string;
}

export class UpdateBusinessImageDto {
    @ApiPropertyOptional({ description: TYPE_DESCRIPTION, enum: Object.values(BusinessImageType) })
    @IsOptionalNotNull()
    @IsIn(Object.values(BusinessImageType))
    type?: BusinessImageType;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: 255, description: '`null` remove o texto alternativo.', example: 'Fachada da barbearia' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    altText?: string | null;
}

export class BusinessImageResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ format: 'uri', example: 'https://files.ascend.com.br/ascend/businesses/0b6f.../images/5d1c....webp' })
    url: string;

    @ApiProperty({ type: String, nullable: true, example: 'Fachada da barbearia' })
    altText: string | null;

    @ApiProperty({ enum: Object.values(BusinessImageType) })
    type: BusinessImageType;

    @ApiProperty({ example: 0 })
    displayOrder: number;

    @ApiProperty({ format: 'date-time' })
    createdAt: Date;

    static from(image: BusinessImageEntity): BusinessImageResponseDto {
        const dto = new BusinessImageResponseDto();
        dto.id = image.id;
        dto.url = storageUrl(image.storageKey);
        dto.altText = image.altText;
        dto.type = image.type;
        dto.displayOrder = image.displayOrder;
        dto.createdAt = image.createdAt;
        return dto;
    }
}
