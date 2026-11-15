import { ApiProperty } from '@nestjs/swagger';
import { BusinessStatus } from '../../../common/enums/business-status.enum.js';
import { storageUrl } from '../../../common/storage/storage-url.js';
import type { BusinessEntity } from '../../../database/entities/business.entity.js';
import { AddressDto } from './address.dto.js';

export class BusinessResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Barbearia do João' })
    name: string;

    @ApiProperty({ example: 'barbearia-do-joao' })
    slug: string;

    @ApiProperty({ type: String, nullable: true, example: 'Cortes clássicos e barba desde 1998.' })
    description: string | null;

    @ApiProperty({ type: String, format: 'uri', nullable: true })
    logoUrl: string | null;

    @ApiProperty({ format: 'email', example: 'contato@barbeariadojoao.com.br' })
    email: string;

    @ApiProperty({ description: 'CPF ou CNPJ sem máscara.', example: '11222333000181' })
    taxId: string;

    @ApiProperty({ type: String, nullable: true, description: 'Telefone de contato em E.164.', example: '+5511999990000' })
    phone: string | null;

    @ApiProperty({ description: 'Indica que o telefone de contato atende no WhatsApp.', example: true })
    phoneIsWhatsApp: boolean;

    @ApiProperty({ enum: Object.values(BusinessStatus) })
    status: BusinessStatus;

    @ApiProperty({ description: 'Fuso horário IANA.', example: 'America/Sao_Paulo' })
    timezone: string;

    @ApiProperty({ type: AddressDto })
    address: AddressDto;

    @ApiProperty({ format: 'date-time' })
    createdAt: Date;

    static from(business: BusinessEntity): BusinessResponseDto {
        const dto = new BusinessResponseDto();
        dto.id = business.id;
        dto.name = business.name;
        dto.slug = business.slug;
        dto.description = business.description;
        dto.logoUrl = business.logoKey && storageUrl(business.logoKey);
        dto.email = business.email;
        dto.taxId = business.taxId;
        dto.phone = business.phone;
        dto.phoneIsWhatsApp = business.phoneIsWhatsApp;
        dto.status = business.status;
        dto.timezone = business.timezone;
        dto.address = AddressDto.from(business.address);
        dto.createdAt = business.createdAt;
        return dto;
    }
}
