import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsOptionalNotNull } from '../../../common/validation/is-optional-not-null.decorator.js';
import type { SpecialtyEntity } from '../../../database/entities/specialty.entity.js';

export class CreateSpecialtyDto {
    @ApiProperty({ description: 'Único no negócio.', maxLength: 100, example: 'Barba' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: 255, example: 'Modelagem e acabamento com navalha.' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string | null;
}

export class UpdateSpecialtyDto {
    @ApiPropertyOptional({ description: 'Único no negócio.', maxLength: 100, example: 'Barba' })
    @IsOptionalNotNull()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: 255, description: '`null` remove a descrição.', example: 'Modelagem e acabamento com navalha.' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string | null;
}

export class SpecialtyResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Barba' })
    name: string;

    @ApiProperty({ type: String, nullable: true, example: 'Modelagem e acabamento com navalha.' })
    description: string | null;

    static from(specialty: SpecialtyEntity): SpecialtyResponseDto {
        const dto = new SpecialtyResponseDto();
        dto.id = specialty.id;
        dto.name = specialty.name;
        dto.description = specialty.description;
        return dto;
    }
}
