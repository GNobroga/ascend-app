import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsTimeZone, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { normalizeTaxId } from '../../../common/utilities/tax-id.js';
import { IsOptionalNotNull } from '../../../common/validation/is-optional-not-null.decorator.js';
import { IsPhone } from '../../../common/validation/is-phone.decorator.js';
import { IsTaxId } from '../../../common/validation/is-tax-id.decorator.js';
import { AddressDto } from './address.dto.js';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const BUSINESS_PHONE_DESCRIPTION = 'Telefone de contato exibido ao público. Aceita máscara; sem DDI é tratado como brasileiro. Gravado em E.164.';
export const PHONE_IS_WHATSAPP_DESCRIPTION = 'Indica que o telefone de contato atende no WhatsApp. Sem telefone, fica sempre `false`.';

export class CreateBusinessDto {
    @ApiProperty({ maxLength: 255, example: 'Barbearia do João' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiProperty({ description: 'Identificador único usado nas URLs públicas: minúsculas, números e hífens.', minLength: 3, maxLength: 100, pattern: SLUG_PATTERN.source, example: 'barbearia-do-joao' })
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    @Matches(SLUG_PATTERN)
    slug: string;

    @ApiPropertyOptional({ type: String, nullable: true, example: 'Cortes clássicos e barba desde 1998.' })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiProperty({ description: 'E-mail de contato do negócio.', format: 'email', maxLength: 320, example: 'contato@barbeariadojoao.com.br' })
    @IsEmail()
    @MaxLength(320)
    email: string;

    @ApiProperty({ description: 'CPF ou CNPJ (inclusive alfanumérico); a máscara é removida.', example: '11222333000181' })
    @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? normalizeTaxId(value) : value))
    @IsTaxId()
    taxId: string;

    @ApiPropertyOptional({ type: String, nullable: true, description: BUSINESS_PHONE_DESCRIPTION, example: '(11) 99999-0000' })
    @IsOptional()
    @IsPhone()
    phone?: string | null;

    @ApiPropertyOptional({ description: PHONE_IS_WHATSAPP_DESCRIPTION, default: false })
    @IsOptionalNotNull()
    @IsBoolean()
    phoneIsWhatsApp?: boolean;

    @ApiPropertyOptional({ description: 'Fuso horário IANA.', default: 'America/Sao_Paulo', example: 'America/Sao_Paulo' })
    @IsOptional()
    @IsTimeZone()
    timezone?: string;

    @ApiProperty({ type: AddressDto })
    @ValidateNested()
    @Type(() => AddressDto)
    address: AddressDto;
}
