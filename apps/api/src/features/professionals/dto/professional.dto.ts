import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { BusinessMemberStatus } from '../../../common/enums/business-member-status.enum.js';
import { storageUrl } from '../../../common/storage/storage-url.js';
import { IsOptionalNotNull } from '../../../common/validation/is-optional-not-null.decorator.js';
import type { ProfessionalEntity } from '../../../database/entities/professional.entity.js';
import type { ProfessionalPackageEntity } from '../../../database/entities/professional-package.entity.js';
import type { ProfessionalServiceEntity } from '../../../database/entities/professional-service.entity.js';
import { SpecialtyResponseDto } from './specialty.dto.js';

const COMMISSION = { minimum: 0, maximum: 100, example: 40 } as const;
const IsCommission = () => IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false });

export class CreateProfessionalDto {
    @ApiProperty({ format: 'uuid', description: 'Membro do negócio que vai atender.' })
    @IsUUID()
    memberId: string;

    @ApiProperty({ maxLength: 255, example: 'Maria Souza' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    displayName: string;

    @ApiPropertyOptional({ type: String, nullable: true, example: 'Barbeira há 10 anos, especialista em degradê.' })
    @IsOptional()
    @IsString()
    bio?: string | null;

    @ApiPropertyOptional({ description: 'Comissão padrão em %, até 2 casas decimais.', default: 0, ...COMMISSION })
    @IsOptionalNotNull()
    @IsCommission()
    @Min(0)
    @Max(100)
    commissionPercent?: number;
}

export class UpdateProfessionalDto {
    @ApiPropertyOptional({ maxLength: 255, example: 'Maria Souza' })
    @IsOptionalNotNull()
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    displayName?: string;

    @ApiPropertyOptional({ type: String, nullable: true, description: '`null` remove a bio.', example: 'Barbeira há 10 anos, especialista em degradê.' })
    @IsOptional()
    @IsString()
    bio?: string | null;

    @ApiPropertyOptional({ description: 'Comissão padrão em %, até 2 casas decimais.', ...COMMISSION })
    @IsOptionalNotNull()
    @IsCommission()
    @Min(0)
    @Max(100)
    commissionPercent?: number;
}

export class ProfessionalServiceItemDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    serviceId: string;

    @ApiPropertyOptional({ type: Number, nullable: true, description: 'Comissão deste serviço em %; `null` ou omitida usa a padrão do profissional.', ...COMMISSION })
    @IsOptional()
    @IsCommission()
    @Min(0)
    @Max(100)
    commissionPercent?: number | null;
}

export class SetProfessionalServicesDto {
    @ApiProperty({ type: [ProfessionalServiceItemDto], description: 'Todos os serviços que o profissional executa; substitui a lista atual.' })
    @IsArray()
    @ArrayUnique((s: ProfessionalServiceItemDto) => s.serviceId)
    @ValidateNested({ each: true })
    @Type(() => ProfessionalServiceItemDto)
    services: ProfessionalServiceItemDto[];
}

export class ProfessionalPackageItemDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    packageId: string;

    @ApiPropertyOptional({ type: Number, nullable: true, description: 'Comissão deste pacote em %, usada no modo `package`; `null` ou omitida usa a padrão do profissional.', ...COMMISSION })
    @IsOptional()
    @IsCommission()
    @Min(0)
    @Max(100)
    commissionPercent?: number | null;
}

export class SetProfessionalPackagesDto {
    @ApiProperty({ type: [ProfessionalPackageItemDto], description: 'Todos os pacotes que o profissional atende; substitui a lista atual.' })
    @IsArray()
    @ArrayUnique((p: ProfessionalPackageItemDto) => p.packageId)
    @ValidateNested({ each: true })
    @Type(() => ProfessionalPackageItemDto)
    packages: ProfessionalPackageItemDto[];
}

export class SetProfessionalSpecialtiesDto {
    @ApiProperty({ type: [String], format: 'uuid', description: 'Todas as especialidades do profissional; substitui a lista atual.' })
    @IsArray()
    @ArrayUnique()
    @IsUUID('all', { each: true })
    specialtyIds: string[];
}

export class ProfessionalServiceResponseDto {
    @ApiProperty({ format: 'uuid' })
    serviceId: string;

    @ApiProperty({ example: 'Corte masculino' })
    name: string;

    @ApiProperty({ type: Number, nullable: true, description: 'Comissão deste serviço em %; `null` usa a padrão do profissional.', example: 50 })
    commissionPercent: number | null;

    static from(link: ProfessionalServiceEntity): ProfessionalServiceResponseDto {
        const dto = new ProfessionalServiceResponseDto();
        dto.serviceId = link.service.id;
        dto.name = link.service.name;
        dto.commissionPercent = link.commissionPercent;
        return dto;
    }
}

export class ProfessionalPackageResponseDto {
    @ApiProperty({ format: 'uuid' })
    packageId: string;

    @ApiProperty({ example: 'Corte + Barba' })
    name: string;

    @ApiProperty({ type: Number, nullable: true, description: 'Comissão deste pacote em %; `null` usa a padrão do profissional.', example: 35 })
    commissionPercent: number | null;

    static from(link: ProfessionalPackageEntity): ProfessionalPackageResponseDto {
        const dto = new ProfessionalPackageResponseDto();
        dto.packageId = link.package.id;
        dto.name = link.package.name;
        dto.commissionPercent = link.commissionPercent;
        return dto;
    }
}

export class ProfessionalResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ format: 'uuid' })
    memberId: string;

    @ApiProperty({ enum: Object.values(BusinessMemberStatus), description: 'Status do membro; só `active` recebe agendamentos.' })
    memberStatus: BusinessMemberStatus;

    @ApiProperty({ example: 'Maria Souza' })
    displayName: string;

    @ApiProperty({ type: String, nullable: true, example: 'Barbeira há 10 anos, especialista em degradê.' })
    bio: string | null;

    @ApiProperty({ type: String, format: 'uri', nullable: true })
    photoUrl: string | null;

    @ApiProperty({ description: 'Comissão padrão em %.', example: 40 })
    commissionPercent: number;

    @ApiProperty({ type: [ProfessionalServiceResponseDto] })
    services: ProfessionalServiceResponseDto[];

    @ApiProperty({ type: [ProfessionalPackageResponseDto], description: 'Pacotes que o profissional atende.' })
    packages: ProfessionalPackageResponseDto[];

    @ApiProperty({ type: [SpecialtyResponseDto] })
    specialties: SpecialtyResponseDto[];

    @ApiProperty({ format: 'date-time' })
    createdAt: Date;

    static from(professional: ProfessionalEntity): ProfessionalResponseDto {
        const dto = new ProfessionalResponseDto();
        dto.id = professional.id;
        dto.memberId = professional.member.id;
        dto.memberStatus = professional.member.status;
        dto.displayName = professional.displayName;
        dto.bio = professional.bio;
        dto.photoUrl = professional.photoKey && storageUrl(professional.photoKey);
        dto.commissionPercent = professional.commissionPercent;
        dto.services = professional.services.filter((s) => s.service).map((s) => ProfessionalServiceResponseDto.from(s));
        dto.packages = professional.packages.filter((p) => p.package).map((p) => ProfessionalPackageResponseDto.from(p));
        dto.specialties = professional.specialties.map((s) => SpecialtyResponseDto.from(s.specialty));
        dto.createdAt = professional.createdAt;
        return dto;
    }
}
