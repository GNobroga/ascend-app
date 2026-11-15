import { ApiProperty } from '@nestjs/swagger';
import type { PostalCodeAddress } from '../../../common/postal-code/postal-code-provider.js';

export class PostalCodeResponseDto {
    @ApiProperty({ description: 'CEP com 8 dígitos, sem hífen.', pattern: '^\\d{8}$', example: '01310100' })
    postalCode: string;

    @ApiProperty({ type: String, nullable: true, description: 'Logradouro; `null` em CEP geral de cidade.', example: 'Avenida Paulista' })
    street: string | null;

    @ApiProperty({ type: String, nullable: true, description: 'Bairro; `null` em CEP geral de cidade.', example: 'Bela Vista' })
    district: string | null;

    @ApiProperty({ example: 'São Paulo' })
    city: string;

    @ApiProperty({ description: 'UF.', example: 'SP' })
    state: string;

    static from(address: PostalCodeAddress): PostalCodeResponseDto {
        const dto = new PostalCodeResponseDto();
        dto.postalCode = address.postalCode;
        dto.street = address.street;
        dto.district = address.district;
        dto.city = address.city;
        dto.state = address.state;
        return dto;
    }
}
