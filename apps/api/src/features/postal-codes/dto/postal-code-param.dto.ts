import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

export class PostalCodeParamDto {
    @ApiProperty({ description: 'CEP com 8 dígitos; aceita máscara (`01310-100`).', example: '01310100' })
    @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
    @Matches(/^\d{8}$/, { message: 'O CEP deve ter 8 dígitos.' })
    postalCode: string;
}
