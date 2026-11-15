import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsOptionalNotNull } from '../../../common/validation/is-optional-not-null.decorator.js';
import { IsPhone } from '../../../common/validation/is-phone.decorator.js';

export class UpdateProfileDto {
    @ApiPropertyOptional({ maxLength: 255, example: 'Maria Silva' })
    @IsOptionalNotNull()
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({ type: String, nullable: true, description: 'Aceita máscara e número brasileiro sem DDI; é gravado em E.164. Trocar o número desfaz a verificação. `null` remove o telefone.', example: '+5511999999999' })
    @IsOptional()
    @IsPhone()
    phone?: string | null;
}
