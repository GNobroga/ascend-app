import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsTimeZone, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { IsOptionalNotNull } from '../../../common/validation/is-optional-not-null.decorator.js';
import { IsPhone } from '../../../common/validation/is-phone.decorator.js';
import { AddressDto } from './address.dto.js';
import { BUSINESS_PHONE_DESCRIPTION, PHONE_IS_WHATSAPP_DESCRIPTION, SLUG_PATTERN } from './create-business.dto.js';

export class UpdateBusinessDto {
    @ApiPropertyOptional({ maxLength: 255, example: 'Barbearia do João' })
    @IsOptionalNotNull()
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({ description: 'Trocar o slug quebra links públicos antigos.', minLength: 3, maxLength: 100, pattern: SLUG_PATTERN.source, example: 'barbearia-do-joao' })
    @IsOptionalNotNull()
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    @Matches(SLUG_PATTERN)
    slug?: string;

    @ApiPropertyOptional({ type: String, nullable: true, description: '`null` remove a descrição.', example: 'Cortes clássicos e barba desde 1998.' })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiPropertyOptional({ format: 'email', maxLength: 320, example: 'contato@barbeariadojoao.com.br' })
    @IsOptionalNotNull()
    @IsEmail()
    @MaxLength(320)
    email?: string;

    @ApiPropertyOptional({ type: String, nullable: true, description: `${BUSINESS_PHONE_DESCRIPTION} \`null\` remove o telefone.`, example: '(11) 99999-0000' })
    @IsOptional()
    @IsPhone()
    phone?: string | null;

    @ApiPropertyOptional({ description: PHONE_IS_WHATSAPP_DESCRIPTION })
    @IsOptionalNotNull()
    @IsBoolean()
    phoneIsWhatsApp?: boolean;

    @ApiPropertyOptional({ description: 'Fuso horário IANA.', example: 'America/Sao_Paulo' })
    @IsOptionalNotNull()
    @IsTimeZone()
    timezone?: string;

    @ApiPropertyOptional({ type: AddressDto, description: 'Substitui o endereço inteiro.' })
    @IsOptionalNotNull()
    @ValidateNested()
    @Type(() => AddressDto)
    address?: AddressDto;
}
