import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, Matches, ValidateIf } from 'class-validator';
import { Weekday } from '../../../common/enums/weekday.enum.js';
import { TIME_PATTERN, toHourMinute } from '../../../common/utilities/time-range.js';
import type { BusinessHourEntity } from '../../../database/entities/business-hour.entity.js';

export class BusinessHourDto {
    @ApiProperty({ description: 'Dia da semana (domingo = 0).', enum: Object.values(Weekday), example: Weekday.MONDAY })
    @IsIn(Object.values(Weekday))
    dayOfWeek: Weekday;

    @ApiProperty({ description: 'Fechado neste dia; se `true`, `openTime` e `closeTime` são ignorados e voltam `null`.', example: false })
    @IsBoolean()
    isClosed: boolean;

    @ApiProperty({ type: String, nullable: true, description: 'Abertura (HH:mm); obrigatório se aberto.', pattern: TIME_PATTERN.source, example: '09:00' })
    @ValidateIf((o: BusinessHourDto) => !o.isClosed)
    @Matches(TIME_PATTERN)
    openTime: string | null;

    @ApiProperty({ type: String, nullable: true, description: 'Fechamento (HH:mm), depois da abertura; obrigatório se aberto.', pattern: TIME_PATTERN.source, example: '18:00' })
    @ValidateIf((o: BusinessHourDto) => !o.isClosed)
    @Matches(TIME_PATTERN)
    closeTime: string | null;

    static from(hour: BusinessHourEntity): BusinessHourDto {
        const dto = new BusinessHourDto();
        dto.dayOfWeek = hour.dayOfWeek;
        dto.isClosed = hour.isClosed;
        dto.openTime = hour.openTime && toHourMinute(hour.openTime);
        dto.closeTime = hour.closeTime && toHourMinute(hour.closeTime);
        return dto;
    }
}
