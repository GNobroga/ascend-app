import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { storageUrl } from '../../../common/storage/storage-url.js';
import type { ProfessionalEntity } from '../../../database/entities/professional.entity.js';

export class PublicProfessionalsQueryDto {
    @ApiPropertyOptional({ format: 'uuid', description: 'Só profissionais que executam este serviço.' })
    @IsOptional()
    @IsUUID()
    serviceId?: string;
}

export class PublicProfessionalDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Maria Souza' })
    displayName: string;

    @ApiProperty({ type: String, nullable: true, example: 'Barbeira há 10 anos, especialista em degradê.' })
    bio: string | null;

    @ApiProperty({ type: String, format: 'uri', nullable: true })
    photoUrl: string | null;

    @ApiProperty({ type: [String], description: 'Nomes das especialidades, em ordem alfabética.', example: ['Barba', 'Degradê'] })
    specialties: string[];

    static from(professional: ProfessionalEntity): PublicProfessionalDto {
        const dto = new PublicProfessionalDto();
        dto.id = professional.id;
        dto.displayName = professional.displayName;
        dto.bio = professional.bio;
        dto.photoUrl = professional.photoKey && storageUrl(professional.photoKey);
        dto.specialties = professional.specialties.map((s) => s.specialty.name);
        return dto;
    }
}
