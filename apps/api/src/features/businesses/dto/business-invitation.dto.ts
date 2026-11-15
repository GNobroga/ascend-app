import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsEmail, IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { BusinessMemberRole } from '../../../common/enums/business-member-role.enum.js';
import { storageUrl } from '../../../common/storage/storage-url.js';
import type { BusinessInvitationEntity } from '../../../database/entities/business-invitation.entity.js';
import { ROLES, ROLES_DESCRIPTION } from './business-member.dto.js';

export class CreateBusinessInvitationDto {
    @ApiProperty({ description: 'E-mail da pessoa convidada; ela pode ainda não ter conta.', format: 'email', maxLength: 320, example: 'maria@email.com' })
    @IsEmail()
    @MaxLength(320)
    email: string;

    @ApiProperty({ description: `${ROLES_DESCRIPTION} São aplicados quando o convite é aceito.`, enum: ROLES, isArray: true, minItems: 1, uniqueItems: true, example: [BusinessMemberRole.PROFESSIONAL] })
    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @IsIn(ROLES, { each: true })
    roles: BusinessMemberRole[];
}

export class InvitationTokenDto {
    @ApiProperty({ description: 'Token do link enviado por e-mail (`/accept-invitation?token=`).', maxLength: 100 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    token: string;
}

export class BusinessInvitationResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ format: 'email', example: 'maria@email.com' })
    email: string;

    @ApiProperty({ enum: ROLES, isArray: true, example: [BusinessMemberRole.PROFESSIONAL] })
    roles: BusinessMemberRole[];

    @ApiProperty({ type: String, nullable: true, description: 'Quem enviou o convite por último.', example: 'João Silva' })
    invitedByName: string | null;

    @ApiProperty({ format: 'date-time' })
    expiresAt: Date;

    @ApiProperty({ description: 'Expirado; pode ser reenviado para gerar um novo link.' })
    isExpired: boolean;

    @ApiProperty({ format: 'date-time' })
    createdAt: Date;

    static from(invitation: BusinessInvitationEntity): BusinessInvitationResponseDto {
        const dto = new BusinessInvitationResponseDto();
        dto.id = invitation.id;
        dto.email = invitation.email;
        dto.roles = invitation.roles;
        dto.invitedByName = invitation.invitedBy?.name ?? null;
        dto.expiresAt = invitation.expiresAt;
        dto.isExpired = invitation.expiresAt <= new Date();
        dto.createdAt = invitation.createdAt;
        return dto;
    }
}

export class InvitationPreviewResponseDto {
    @ApiProperty({ example: 'Barbearia do João' })
    businessName: string;

    @ApiProperty({ example: 'barbearia-do-joao' })
    businessSlug: string;

    @ApiProperty({ type: String, format: 'uri', nullable: true })
    businessLogoUrl: string | null;

    @ApiProperty({ format: 'email', description: 'E-mail convidado; é preciso entrar com uma conta deste e-mail para aceitar.', example: 'maria@email.com' })
    email: string;

    @ApiProperty({ enum: ROLES, isArray: true, example: [BusinessMemberRole.PROFESSIONAL] })
    roles: BusinessMemberRole[];

    @ApiProperty({ format: 'date-time' })
    expiresAt: Date;

    static from(invitation: BusinessInvitationEntity): InvitationPreviewResponseDto {
        const dto = new InvitationPreviewResponseDto();
        dto.businessName = invitation.business.name;
        dto.businessSlug = invitation.business.slug;
        dto.businessLogoUrl = invitation.business.logoKey && storageUrl(invitation.business.logoKey);
        dto.email = invitation.email;
        dto.roles = invitation.roles;
        dto.expiresAt = invitation.expiresAt;
        return dto;
    }
}
