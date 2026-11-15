import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDivisibleBy, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { storageUrl } from '../../../common/storage/storage-url.js';
import { IsOptionalNotNull } from '../../../common/validation/is-optional-not-null.decorator.js';
import type { ServiceEntity } from '../../../database/entities/service.entity.js';

export const MIN_DURATION = 5;
export const MAX_DURATION = 720;
export const DURATION_STEP = 5;
export const MAX_PRICE = 99_999_999.99;

export class CreateServiceDto {
    @ApiProperty({ maxLength: 255, example: 'Corte masculino' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({ type: String, nullable: true, example: 'Corte na tesoura ou máquina, com lavagem.' })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiProperty({ description: `Duração em minutos, múltiplo de ${DURATION_STEP}.`, minimum: MIN_DURATION, maximum: MAX_DURATION, multipleOf: DURATION_STEP, example: 30 })
    @IsInt()
    @Min(MIN_DURATION)
    @Max(MAX_DURATION)
    @IsDivisibleBy(DURATION_STEP)
    durationInMinutes: number;

    @ApiProperty({ description: 'Preço em reais, até 2 casas decimais.', minimum: 0, maximum: MAX_PRICE, example: 49.9 })
    @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
    @Min(0)
    @Max(MAX_PRICE)
    price: number;

    @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true, description: 'Categoria do mesmo negócio.' })
    @IsOptional()
    @IsUUID()
    categoryId?: string | null;

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

export class UpdateServiceDto {
    @ApiPropertyOptional({ maxLength: 255, example: 'Corte masculino' })
    @IsOptionalNotNull()
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({ type: String, nullable: true, description: '`null` remove a descrição.', example: 'Corte na tesoura ou máquina, com lavagem.' })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiPropertyOptional({ description: `Duração em minutos, múltiplo de ${DURATION_STEP}.`, minimum: MIN_DURATION, maximum: MAX_DURATION, multipleOf: DURATION_STEP, example: 30 })
    @IsOptionalNotNull()
    @IsInt()
    @Min(MIN_DURATION)
    @Max(MAX_DURATION)
    @IsDivisibleBy(DURATION_STEP)
    durationInMinutes?: number;

    @ApiPropertyOptional({ description: 'Preço em reais, até 2 casas decimais.', minimum: 0, maximum: MAX_PRICE, example: 49.9 })
    @IsOptionalNotNull()
    @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
    @Min(0)
    @Max(MAX_PRICE)
    price?: number;

    @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true, description: '`null` tira o serviço da categoria.' })
    @IsOptional()
    @IsUUID()
    categoryId?: string | null;

    @ApiPropertyOptional({ minimum: 0, example: 0 })
    @IsOptionalNotNull()
    @IsInt()
    @Min(0)
    displayOrder?: number;

    @ApiPropertyOptional({ description: 'Inativo some da página pública e não pode ser agendado.' })
    @IsOptionalNotNull()
    @IsBoolean()
    isActive?: boolean;
}

export class ServiceResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Corte masculino' })
    name: string;

    @ApiProperty({ type: String, nullable: true, example: 'Corte na tesoura ou máquina, com lavagem.' })
    description: string | null;

    @ApiProperty({ description: 'Duração em minutos.', example: 30 })
    durationInMinutes: number;

    @ApiProperty({ description: 'Preço em reais.', example: 49.9 })
    price: number;

    @ApiProperty({ type: String, format: 'uuid', nullable: true })
    categoryId: string | null;

    @ApiProperty({ example: 0 })
    displayOrder: number;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty({ type: String, format: 'uri', nullable: true, description: 'URL da primeira imagem (capa); `null` se não houver.' })
    coverImageUrl: string | null;

    @ApiProperty({ format: 'date-time' })
    createdAt: Date;

    static from(service: ServiceEntity): ServiceResponseDto {
        const dto = new ServiceResponseDto();
        dto.id = service.id;
        dto.name = service.name;
        dto.description = service.description;
        dto.durationInMinutes = service.durationInMinutes;
        dto.price = service.price;
        dto.categoryId = service.category?.id ?? null;
        dto.displayOrder = service.displayOrder;
        dto.isActive = service.isActive;
        dto.coverImageUrl = service.images?.[0] ? storageUrl(service.images[0].storageKey) : null;
        dto.createdAt = service.createdAt;
        return dto;
    }
}
