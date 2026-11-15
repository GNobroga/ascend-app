import { ApiProperty } from '@nestjs/swagger';
import { BusinessMemberRole } from '../../../common/enums/business-member-role.enum.js';
import { BusinessStatus } from '../../../common/enums/business-status.enum.js';
import { storageUrl } from '../../../common/storage/storage-url.js';
import type { BusinessMemberEntity } from '../../../database/entities/business-member.entity.js';

export class MyBusinessResponseDto {
    @ApiProperty({ format: 'uuid', description: 'Id do negócio, usado nas rotas `/api/businesses/:businessId/...`.' })
    id: string;

    @ApiProperty({ example: 'Barbearia do João' })
    name: string;

    @ApiProperty({ example: 'barbearia-do-joao' })
    slug: string;

    @ApiProperty({ type: String, format: 'uri', nullable: true })
    logoUrl: string | null;

    @ApiProperty({ enum: Object.values(BusinessStatus) })
    status: BusinessStatus;

    @ApiProperty({ description: 'Papéis do usuário neste negócio.', enum: Object.values(BusinessMemberRole), isArray: true, example: [BusinessMemberRole.OWNER] })
    roles: BusinessMemberRole[];

    static from(member: BusinessMemberEntity): MyBusinessResponseDto {
        const dto = new MyBusinessResponseDto();
        dto.id = member.business.id;
        dto.name = member.business.name;
        dto.slug = member.business.slug;
        dto.logoUrl = member.business.logoKey && storageUrl(member.business.logoKey);
        dto.status = member.business.status;
        dto.roles = member.roles.map((r) => r.role);
        return dto;
    }
}
