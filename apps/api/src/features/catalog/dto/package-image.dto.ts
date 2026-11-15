import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ImageUploadDto } from '../../../common/storage/image-upload.decorator.js';
import { storageUrl } from '../../../common/storage/storage-url.js';
import type { PackageImageEntity } from '../../../database/entities/package-image.entity.js';

export class CreatePackageImageDto extends ImageUploadDto {
    @ApiPropertyOptional({ maxLength: 255, example: 'Corte e barba finalizados' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    altText?: string;
}

export class UpdatePackageImageDto {
    @ApiPropertyOptional({ type: String, nullable: true, maxLength: 255, description: '`null` remove o texto alternativo.', example: 'Corte e barba finalizados' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    altText?: string | null;
}

export class PackageImageResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ format: 'uri' })
    url: string;

    @ApiProperty({ type: String, nullable: true, example: 'Corte e barba finalizados' })
    altText: string | null;

    @ApiProperty({ example: 0 })
    displayOrder: number;

    @ApiProperty({ format: 'date-time' })
    createdAt: Date;

    static from(image: PackageImageEntity): PackageImageResponseDto {
        const dto = new PackageImageResponseDto();
        dto.id = image.id;
        dto.url = storageUrl(image.storageKey);
        dto.altText = image.altText;
        dto.displayOrder = image.displayOrder;
        dto.createdAt = image.createdAt;
        return dto;
    }
}
