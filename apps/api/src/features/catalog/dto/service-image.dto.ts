import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ImageUploadDto } from '../../../common/storage/image-upload.decorator.js';
import { storageUrl } from '../../../common/storage/storage-url.js';
import type { ImageBaseEntity } from '../../../database/entities/base/image-base.entity.js';
import type { ServiceImageEntity } from '../../../database/entities/service-image.entity.js';

export class CreateServiceImageDto extends ImageUploadDto {
    @ApiPropertyOptional({ maxLength: 255, example: 'Degradê com risco' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    altText?: string;
}

export class UpdateServiceImageDto {
    @ApiPropertyOptional({ type: String, nullable: true, maxLength: 255, description: '`null` remove o texto alternativo.', example: 'Degradê com risco' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    altText?: string | null;
}

export class ServiceImageResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ format: 'uri' })
    url: string;

    @ApiProperty({ type: String, nullable: true, example: 'Degradê com risco' })
    altText: string | null;

    @ApiProperty({ example: 0 })
    displayOrder: number;

    @ApiProperty({ format: 'date-time' })
    createdAt: Date;

    static from(image: ServiceImageEntity): ServiceImageResponseDto {
        const dto = new ServiceImageResponseDto();
        dto.id = image.id;
        dto.url = storageUrl(image.storageKey);
        dto.altText = image.altText;
        dto.displayOrder = image.displayOrder;
        dto.createdAt = image.createdAt;
        return dto;
    }
}

export class PublicServiceImageDto {
    @ApiProperty({ format: 'uri' })
    url: string;

    @ApiProperty({ type: String, nullable: true, example: 'Degradê com risco' })
    altText: string | null;

    static from(image: Pick<ImageBaseEntity, 'storageKey' | 'altText'>): PublicServiceImageDto {
        const dto = new PublicServiceImageDto();
        dto.url = storageUrl(image.storageKey);
        dto.altText = image.altText;
        return dto;
    }
}
