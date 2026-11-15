import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
    @ApiProperty({ format: 'email', maxLength: 320, example: 'maria@exemplo.com' })
    @IsEmail()
    @MaxLength(320)
    email: string;
}
