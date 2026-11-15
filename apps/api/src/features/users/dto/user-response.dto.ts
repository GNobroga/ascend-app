import { ApiProperty } from '@nestjs/swagger';
import type { UserEntity } from '../../../database/entities/user.entity.js';
import { userPhotoUrl } from '../user-photo.js';

export class UserResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Maria Silva' })
    name: string;

    @ApiProperty({ format: 'email', example: 'maria@exemplo.com' })
    email: string;

    @ApiProperty({ type: String, format: 'date-time', nullable: true, description: 'Quando o e-mail foi verificado; `null` se ainda não foi.' })
    emailVerifiedAt: Date | null;

    @ApiProperty({ type: String, format: 'uri', nullable: true, description: 'Foto enviada pelo usuário ou, na falta dela, a da conta Google.' })
    photoUrl: string | null;

    @ApiProperty({ type: String, nullable: true, description: 'Telefone com DDI.', example: '+5511999999999' })
    phone: string | null;

    @ApiProperty({ type: String, format: 'date-time', nullable: true })
    phoneVerifiedAt: Date | null;

    @ApiProperty({ description: 'Se a conta tem senha; `false` em contas criadas só pelo Google.' })
    hasPassword: boolean;

    @ApiProperty({ format: 'date-time' })
    createdAt: Date;

    static from(user: UserEntity): UserResponseDto {
        const dto = new UserResponseDto();
        dto.id = user.id;
        dto.name = user.name;
        dto.email = user.email;
        dto.emailVerifiedAt = user.emailVerifiedAt;
        dto.photoUrl = userPhotoUrl(user);
        dto.phone = user.phone;
        dto.phoneVerifiedAt = user.phoneVerifiedAt;
        dto.hasPassword = user.passwordHash !== null;
        dto.createdAt = user.createdAt;
        return dto;
    }
}
