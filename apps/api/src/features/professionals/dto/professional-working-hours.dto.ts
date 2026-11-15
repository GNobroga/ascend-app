import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, Matches, ValidateIf, ValidateNested } from 'class-validator';
import { Weekday } from '../../../common/enums/weekday.enum.js';
import { DAYS_IN_WEEK, TIME_PATTERN, toHourMinute } from '../../../common/utilities/time-range.js';
import type { ProfessionalWorkingHoursEntity } from '../../../database/entities/professional-working-hours.entity.js';

export class ProfessionalWorkingHourDto {
    @ApiProperty({ description: 'Dia da semana (domingo = 0).', enum: Object.values(Weekday), example: Weekday.MONDAY })
    @IsIn(Object.values(Weekday))
    dayOfWeek: Weekday;

    @ApiProperty({ description: 'Folga neste dia; se `true`, `startTime` e `endTime` são ignorados e voltam `null`.', example: false })
    @IsBoolean()
    isDayOff: boolean;

    @ApiProperty({ type: String, nullable: true, description: 'Início do expediente (HH:mm); obrigatório se não for folga.', pattern: TIME_PATTERN.source, example: '09:00' })
    @ValidateIf((o: ProfessionalWorkingHourDto) => !o.isDayOff)
    @Matches(TIME_PATTERN)
    startTime: string | null;

    @ApiProperty({ type: String, nullable: true, description: 'Fim do expediente (HH:mm), depois do início; obrigatório se não for folga.', pattern: TIME_PATTERN.source, example: '18:00' })
    @ValidateIf((o: ProfessionalWorkingHourDto) => !o.isDayOff)
    @Matches(TIME_PATTERN)
    endTime: string | null;

    static from(hour: ProfessionalWorkingHoursEntity): ProfessionalWorkingHourDto {
        const dto = new ProfessionalWorkingHourDto();
        dto.dayOfWeek = hour.dayOfWeek;
        dto.isDayOff = hour.isDayOff;
        dto.startTime = hour.startTime && toHourMinute(hour.startTime);
        dto.endTime = hour.endTime && toHourMinute(hour.endTime);
        return dto;
    }
}

export class SetProfessionalWorkingHoursDto {
    @ApiProperty({
        type: [ProfessionalWorkingHourDto],
        description: 'A semana inteira: exatamente um item por dia (0 a 6). Com o horário do negócio configurado, o expediente precisa caber nele.',
        minItems: DAYS_IN_WEEK,
        maxItems: DAYS_IN_WEEK,
    })
    @IsArray()
    @ArrayMinSize(DAYS_IN_WEEK)
    @ArrayMaxSize(DAYS_IN_WEEK)
    @ArrayUnique((h: ProfessionalWorkingHourDto) => h.dayOfWeek)
    @ValidateNested({ each: true })
    @Type(() => ProfessionalWorkingHourDto)
    workingHours: ProfessionalWorkingHourDto[];
}
