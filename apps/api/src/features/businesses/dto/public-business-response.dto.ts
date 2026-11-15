import { ApiProperty } from '@nestjs/swagger';
import { storageUrl } from '../../../common/storage/storage-url.js';
import type { BusinessEntity } from '../../../database/entities/business.entity.js';
import { AddressDto } from './address.dto.js';
import { BusinessHourDto } from './business-hour.dto.js';
import { BusinessImageResponseDto } from './business-image.dto.js';
import { BusinessSocialLinkDto } from './business-social-link.dto.js';

export class PublicBusinessResponseDto {
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

    @ApiProperty({ description: 'E-mail de contato.', format: 'email', example: 'contato@barbeariadojoao.com.br' })
    email: string;

    @ApiProperty({ type: String, nullable: true, description: 'Telefone de contato em E.164.', example: '+5511999990000' })
    phone: string | null;

    @ApiProperty({ description: 'Indica que o telefone de contato atende no WhatsApp.', example: true })
    phoneIsWhatsApp: boolean;

    @ApiProperty({ description: 'Fuso horário IANA em que os horários são expressos.', example: 'America/Sao_Paulo' })
    timezone: string;

    @ApiProperty({ type: AddressDto })
    address: AddressDto;

    @ApiProperty({ type: [BusinessHourDto], description: 'Horário de funcionamento, ordenado por dia; vazio se ainda não configurado.' })
    hours: BusinessHourDto[];

    @ApiProperty({ type: [BusinessImageResponseDto], description: 'Imagens ordenadas por `displayOrder`; a capa é a de tipo `cover`, se houver.' })
    images: BusinessImageResponseDto[];

    @ApiProperty({ type: [BusinessSocialLinkDto], description: 'Redes sociais na ordem fixa das redes; vazio se nenhuma.' })
    socialLinks: BusinessSocialLinkDto[];

    @ApiProperty({ description: 'Indica se o negócio aceita agendamento online agora; com `false`, esconda o botão de agendar.', example: true })
    onlineBookingAvailable: boolean;

    static from(business: BusinessEntity, onlineBookingAvailable: boolean): PublicBusinessResponseDto {
        const dto = new PublicBusinessResponseDto();
        dto.id = business.id;
        dto.name = business.name;
        dto.slug = business.slug;
        dto.description = business.description;
        dto.logoUrl = business.logoKey && storageUrl(business.logoKey);
        dto.email = business.email;
        dto.phone = business.phone;
        dto.phoneIsWhatsApp = business.phoneIsWhatsApp;
        dto.timezone = business.timezone;
        dto.address = AddressDto.from(business.address);
        dto.hours = business.hours.map((h) => BusinessHourDto.from(h));
        dto.images = business.images.map((i) => BusinessImageResponseDto.from(i));
        dto.socialLinks = BusinessSocialLinkDto.fromAll(business.socialLinks);
        dto.onlineBookingAvailable = onlineBookingAvailable;
        return dto;
    }
}
