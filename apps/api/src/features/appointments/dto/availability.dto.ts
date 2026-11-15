import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsISO8601, IsOptional, IsUUID, Matches } from 'class-validator';
import { LOCAL_DATE_PATTERN } from '../../../common/utilities/time-zone.js';
import type { Availability } from '../availability.service.js';
import type { Slot } from '../slot-calculator.js';

const MAX_SERVICES = 10;

export class AvailabilityQueryDto {
    @ApiProperty({ description: 'Dia (`YYYY-MM-DD`) no fuso do negócio.', pattern: LOCAL_DATE_PATTERN.source, example: '2026-10-27' })
    @Matches(LOCAL_DATE_PATTERN)
    @IsISO8601({ strict: true })
    date: string;

    @ApiPropertyOptional({
        type: [String],
        format: 'uuid',
        description: `Serviços avulsos (1 a ${MAX_SERVICES}); a duração é a soma. Envie \`serviceIds\` ou \`packageId\`, não os dois. Aceita \`serviceIds=a&serviceIds=b\` ou \`serviceIds=a,b\`.`,
        minItems: 1,
        maxItems: MAX_SERVICES,
    })
    @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(MAX_SERVICES)
    @ArrayUnique()
    @IsUUID('all', { each: true })
    serviceIds?: string[];

    @ApiPropertyOptional({ format: 'uuid', description: 'Pacote; a duração é a soma dos serviços dele. Envie `serviceIds` ou `packageId`, não os dois.' })
    @IsOptional()
    @IsUUID()
    packageId?: string;

    @ApiPropertyOptional({ format: 'uuid', description: 'Só este profissional; omitido, junta todos os que atendem o pacote ou executam os serviços.' })
    @IsOptional()
    @IsUUID()
    professionalId?: string;
}

export class AvailabilitySlotDto {
    @ApiProperty({ format: 'date-time', example: '2026-10-27T12:00:00.000Z' })
    startAt: Date;

    @ApiProperty({ format: 'date-time', example: '2026-10-27T12:45:00.000Z' })
    endAt: Date;

    @ApiProperty({ type: [String], format: 'uuid', description: 'Profissionais livres neste horário.' })
    professionalIds: string[];

    static from(slot: Slot): AvailabilitySlotDto {
        const dto = new AvailabilitySlotDto();
        dto.startAt = new Date(slot.start);
        dto.endAt = new Date(slot.end);
        dto.professionalIds = slot.professionalIds;
        return dto;
    }
}

export class AvailabilityResponseDto {
    @ApiProperty({ example: '2026-10-27' })
    date: string;

    @ApiProperty({ description: 'Fuso IANA do negócio, em que `date` é interpretado.', example: 'America/Sao_Paulo' })
    timezone: string;

    @ApiProperty({ description: 'Soma das durações dos serviços.', example: 45 })
    durationMinutes: number;

    @ApiProperty({ type: [AvailabilitySlotDto], description: 'Horários livres em ordem; vazio se não houver.' })
    slots: AvailabilitySlotDto[];

    static from(availability: Availability): AvailabilityResponseDto {
        const dto = new AvailabilityResponseDto();
        dto.date = availability.date;
        dto.timezone = availability.timezone;
        dto.durationMinutes = availability.durationMinutes;
        dto.slots = availability.slots.map((s) => AvailabilitySlotDto.from(s));
        return dto;
    }
}
