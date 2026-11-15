import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @ApiPropertyOptional({ description: 'Senha atual. Obrigatória se a conta já tem senha (`hasPassword`); ignorada em contas só com Google.', maxLength: 128, format: 'password', example: 'senhaSegura123' })
    @IsOptional()
    @IsString()
    @MaxLength(128)
    currentPassword?: string;

    @ApiProperty({ description: 'Nova senha em texto puro.', minLength: 8, maxLength: 128, format: 'password', example: 'novaSenhaSegura123' })
    @IsString()
    @MinLength(8)
    @MaxLength(128)
    newPassword: string;
}
