import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProfessionalTimeOffType } from '../../../common/enums/professional-time-off-type.enum.js';
import { IsOptionalNotNull } from '../../../common/validation/is-optional-not-null.decorator.js';
import type { ProfessionalTimeOffEntity } from '../../../database/entities/professional-time-off.entity.js';

const TYPES = Object.values(ProfessionalTimeOffType);

export class CreateProfessionalTimeOffDto {
    @ApiProperty({ format: 'date-time', example: '2026-12-22T00:00:00-03:00' })
    @Type(() => Date)
    @IsDate()
    startAt: Date;

    @ApiProperty({ format: 'date-time', description: 'Depois de `startAt`.', example: '2027-01-05T00:00:00-03:00' })
    @Type(() => Date)
    @IsDate()
    endAt: Date;

    @ApiProperty({ enum: TYPES, example: ProfessionalTimeOffType.VACATION })
    @IsIn(TYPES)
    type: ProfessionalTimeOffType;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: 500, example: 'Férias de fim de ano' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string | null;
}

export class UpdateProfessionalTimeOffDto {
    @ApiPropertyOptional({ format: 'date-time', example: '2026-12-22T00:00:00-03:00' })
    @IsOptionalNotNull()
    @Type(() => Date)
    @IsDate()
    startAt?: Date;

    @ApiPropertyOptional({ format: 'date-time', description: 'Depois de `startAt`.', example: '2027-01-05T00:00:00-03:00' })
    @IsOptionalNotNull()
    @Type(() => Date)
    @IsDate()
    endAt?: Date;

    @ApiPropertyOptional({ enum: TYPES })
    @IsOptionalNotNull()
    @IsIn(TYPES)
    type?: ProfessionalTimeOffType;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: 500, description: '`null` remove o motivo.', example: 'Férias de fim de ano' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string | null;
}

export class ProfessionalTimeOffQueryDto {
    @ApiPropertyOptional({ format: 'date-time', description: 'Só ausências que terminam depois deste instante.' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    from?: Date;

    @ApiPropertyOptional({ format: 'date-time', description: 'Só ausências que começam antes deste instante.' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    to?: Date;
}

export class ProfessionalTimeOffResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ format: 'date-time' })
    startAt: Date;

    @ApiProperty({ format: 'date-time' })
    endAt: Date;

    @ApiProperty({ enum: TYPES })
    type: ProfessionalTimeOffType;

    @ApiProperty({ type: String, nullable: true, example: 'Férias de fim de ano' })
    reason: string | null;

    static from(timeOff: ProfessionalTimeOffEntity): ProfessionalTimeOffResponseDto {
        const dto = new ProfessionalTimeOffResponseDto();
        dto.id = timeOff.id;
        dto.startAt = timeOff.startAt;
        dto.endAt = timeOff.endAt;
        dto.type = timeOff.type;
        dto.reason = timeOff.reason;
        return dto;
    }
}
