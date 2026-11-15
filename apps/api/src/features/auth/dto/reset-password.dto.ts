import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
    @ApiProperty({ description: 'Token recebido no link do e-mail (`?token=`).', maxLength: 128, example: 'q3Yv0m8xJ2fK9sT1bW4nE7rA5cH6dL0pZ8uG2iO3kXw' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    token: string;

    @ApiProperty({ description: 'Nova senha em texto puro.', minLength: 8, maxLength: 128, format: 'password', example: 'novaSenhaSegura123' })
    @IsString()
    @MinLength(8)
    @MaxLength(128)
    password: string;
}
