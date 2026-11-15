import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { IsOptionalNotNull } from '../../../common/validation/is-optional-not-null.decorator.js';
import type { ServiceCategoryEntity } from '../../../database/entities/service-category.entity.js';

export class CreateServiceCategoryDto {
    @ApiProperty({ maxLength: 100, example: 'Cabelo' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: 255, example: 'Cortes, escova e coloração.' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string | null;

    @ApiPropertyOptional({ description: 'Ordem de exibição; omitida, vai para o fim.', minimum: 0, example: 0 })
    @IsOptionalNotNull()
    @IsInt()
    @Min(0)
    displayOrder?: number;

    @ApiPropertyOptional({ default: true })
    @IsOptionalNotNull()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateServiceCategoryDto {
    @ApiPropertyOptional({ maxLength: 100, example: 'Cabelo' })
    @IsOptionalNotNull()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: 255, description: '`null` remove a descrição.', example: 'Cortes, escova e coloração.' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string | null;

    @ApiPropertyOptional({ minimum: 0, example: 0 })
    @IsOptionalNotNull()
    @IsInt()
    @Min(0)
    displayOrder?: number;

    @ApiPropertyOptional({ description: 'Inativa esconde a categoria e os serviços dela da página pública.' })
    @IsOptionalNotNull()
    @IsBoolean()
    isActive?: boolean;
}

export class ServiceCategoryResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Cabelo' })
    name: string;

    @ApiProperty({ type: String, nullable: true, example: 'Cortes, escova e coloração.' })
    description: string | null;

    @ApiProperty({ example: 0 })
    displayOrder: number;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty({ format: 'date-time' })
    createdAt: Date;

    static from(category: ServiceCategoryEntity): ServiceCategoryResponseDto {
        const dto = new ServiceCategoryResponseDto();
        dto.id = category.id;
        dto.name = category.name;
        dto.description = category.description;
        dto.displayOrder = category.displayOrder;
        dto.isActive = category.isActive;
        dto.createdAt = category.createdAt;
        return dto;
    }
}
