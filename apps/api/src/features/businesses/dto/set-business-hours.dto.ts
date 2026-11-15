import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, ValidateNested } from 'class-validator';
import { DAYS_IN_WEEK } from '../../../common/utilities/time-range.js';
import { BusinessHourDto } from './business-hour.dto.js';

export class SetBusinessHoursDto {
    @ApiProperty({ type: [BusinessHourDto], description: 'A semana inteira: exatamente um item por dia (0 a 6).', minItems: DAYS_IN_WEEK, maxItems: DAYS_IN_WEEK })
    @IsArray()
    @ArrayMinSize(DAYS_IN_WEEK)
    @ArrayMaxSize(DAYS_IN_WEEK)
    @ArrayUnique((h: BusinessHourDto) => h.dayOfWeek)
    @ValidateNested({ each: true })
    @Type(() => BusinessHourDto)
    hours: BusinessHourDto[];
}
