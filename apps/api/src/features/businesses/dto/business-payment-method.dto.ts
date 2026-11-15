import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { BooleanQuery } from '../../../common/http/boolean-query.js';
import { IsOptionalNotNull } from '../../../common/validation/is-optional-not-null.decorator.js';
import type { BusinessPaymentMethodEntity } from '../../../database/entities/business-payment-method.entity.js';

export class PaymentMethodListQueryDto {
    @ApiPropertyOptional({ description: 'Filtra por situação; omitido traz todas.', type: Boolean })
    @IsOptional()
    @BooleanQuery()
    @IsBoolean()
    isActive?: boolean;
}

export class CreatePaymentMethodDto {
    @ApiProperty({ maxLength: 100, example: 'Vale-refeição' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: 255, example: 'Aceitamos as principais bandeiras.' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string | null;

    @ApiPropertyOptional({ default: true })
    @IsOptionalNotNull()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdatePaymentMethodDto {
    @ApiPropertyOptional({ maxLength: 100, example: 'Vale-refeição' })
    @IsOptionalNotNull()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: 255, description: '`null` remove a descrição.', example: 'Aceitamos as principais bandeiras.' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string | null;

    @ApiPropertyOptional({ description: 'Inativa não aceita lançamentos novos; os antigos continuam apontando para ela.' })
    @IsOptionalNotNull()
    @IsBoolean()
    isActive?: boolean;
}

export class PaymentMethodResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Pix' })
    name: string;

    @ApiProperty({ type: String, nullable: true, example: 'Chave: CNPJ do negócio.' })
    description: string | null;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty({ format: 'date-time' })
    createdAt: Date;

    static from(method: BusinessPaymentMethodEntity): PaymentMethodResponseDto {
        const dto = new PaymentMethodResponseDto();
        dto.id = method.id;
        dto.name = method.name;
        dto.description = method.description;
        dto.isActive = method.isActive;
        dto.createdAt = method.createdAt;
        return dto;
    }
}
