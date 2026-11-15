import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsIn } from 'class-validator';
import { BusinessMemberRole } from '../../../common/enums/business-member-role.enum.js';
import { BusinessMemberStatus } from '../../../common/enums/business-member-status.enum.js';
import { IsOptionalNotNull } from '../../../common/validation/is-optional-not-null.decorator.js';
import type { BusinessMemberEntity } from '../../../database/entities/business-member.entity.js';
import { userPhotoUrl } from '../../users/index.js';

export const ROLES = Object.values(BusinessMemberRole);
export const ROLES_DESCRIPTION = 'Papéis no negócio, ao menos um. Só `owner` concede ou retira `owner`.';
const MANAGEABLE_STATUSES = Object.values(BusinessMemberStatus);

export class UpdateBusinessMemberDto {
    @ApiPropertyOptional({ description: `${ROLES_DESCRIPTION} Substitui os papéis atuais.`, enum: ROLES, isArray: true, minItems: 1, uniqueItems: true, example: [BusinessMemberRole.ADMIN] })
    @IsOptionalNotNull()
    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @IsIn(ROLES, { each: true })
    roles?: BusinessMemberRole[];

    @ApiPropertyOptional({ description: 'Membro suspenso perde o acesso ao negócio e não recebe agendamentos.', enum: MANAGEABLE_STATUSES })
    @IsOptionalNotNull()
    @IsIn(MANAGEABLE_STATUSES)
    status?: BusinessMemberStatus;
}

export class BusinessMemberResponseDto {
    @ApiProperty({ format: 'uuid', description: 'Id do vínculo (`memberId`).' })
    id: string;

    @ApiProperty({ format: 'uuid' })
    userId: string;

    @ApiProperty({ example: 'Maria Souza' })
    name: string;

    @ApiProperty({ format: 'email', example: 'maria@email.com' })
    email: string;

    @ApiProperty({ type: String, format: 'uri', nullable: true, description: 'Foto da conta do usuário.' })
    photoUrl: string | null;

    @ApiProperty({ enum: Object.values(BusinessMemberStatus) })
    status: BusinessMemberStatus;

    @ApiProperty({ enum: ROLES, isArray: true, example: [BusinessMemberRole.PROFESSIONAL] })
    roles: BusinessMemberRole[];

    @ApiProperty({ type: String, format: 'uuid', nullable: true, description: 'Perfil de profissional do membro, se ele atende.' })
    professionalId: string | null;

    @ApiProperty({ format: 'date-time' })
    joinedAt: Date;

    static from(member: BusinessMemberEntity): BusinessMemberResponseDto {
        const dto = new BusinessMemberResponseDto();
        dto.id = member.id;
        dto.userId = member.user.id;
        dto.name = member.user.name;
        dto.email = member.user.email;
        dto.photoUrl = userPhotoUrl(member.user);
        dto.status = member.status;
        dto.roles = member.roles.map((r) => r.role);
        dto.professionalId = member.professional?.id ?? null;
        dto.joinedAt = member.joinedAt;
        return dto;
    }
}
