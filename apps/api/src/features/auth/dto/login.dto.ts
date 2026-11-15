import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({ format: 'email', maxLength: 320, example: 'maria@exemplo.com' })
    @IsEmail()
    @MaxLength(320)
    email: string;

    @ApiProperty({ format: 'password', maxLength: 128, example: 'senhaSegura123' })
    @IsString()
    @MaxLength(128)
    password: string;
}
