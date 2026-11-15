import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import type { Address } from '../../../database/entities/embedded/address.embedded.js';

const BRAZILIAN_STATES = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export class AddressDto {
    @ApiProperty({ description: 'CEP com 8 dígitos, sem hífen.', pattern: '^\\d{8}$', example: '01310100' })
    @Matches(/^\d{8}$/)
    postalCode: string;

    @ApiProperty({ maxLength: 255, example: 'Avenida Paulista' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    street: string;

    @ApiProperty({ description: 'Número; aceita "S/N".', maxLength: 20, example: '1578' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    number: string;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: 255, example: 'Sala 12' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    complement?: string | null;

    @ApiProperty({ description: 'Bairro.', maxLength: 100, example: 'Bela Vista' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    district: string;

    @ApiProperty({ maxLength: 100, example: 'São Paulo' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    city: string;

    @ApiProperty({ description: 'UF.', enum: BRAZILIAN_STATES, example: 'SP' })
    @IsIn(BRAZILIAN_STATES)
    state: string;

    static from(address: Address): AddressDto {
        const dto = new AddressDto();
        dto.postalCode = address.postalCode;
        dto.street = address.street;
        dto.number = address.number;
        dto.complement = address.complement ?? null;
        dto.district = address.district;
        dto.city = address.city;
        dto.state = address.state;
        return dto;
    }
}
