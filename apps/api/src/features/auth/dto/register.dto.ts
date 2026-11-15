import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
    @ApiProperty({ description: 'Nome completo.', maxLength: 255, example: 'Maria Silva' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiProperty({ description: 'E-mail de login; normalizado em minúsculas.', format: 'email', maxLength: 320, example: 'maria@exemplo.com' })
    @IsEmail()
    @MaxLength(320)
    email: string;

    @ApiProperty({ description: 'Senha em texto puro.', minLength: 8, maxLength: 128, format: 'password', example: 'senhaSegura123' })
    @IsString()
    @MinLength(8)
    @MaxLength(128)
    password: string;
}
