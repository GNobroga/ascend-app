import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsDivisibleBy,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import { CommissionMode } from '../../../common/enums/commission-mode.enum.js';
import { storageUrl } from '../../../common/storage/storage-url.js';
import { IsOptionalNotNull } from '../../../common/validation/is-optional-not-null.decorator.js';
import type { PackageServiceEntity } from '../../../database/entities/package-service.entity.js';
import type { PackageEntity } from '../../../database/entities/package.entity.js';
import type { ProfessionalPackageEntity } from '../../../database/entities/professional-package.entity.js';
import { ServiceCategoryListQueryDto } from './catalog-list-query.dto.js';
import { PublicServiceImageDto } from './service-image.dto.js';
import { DURATION_STEP, MAX_DURATION, MAX_PRICE, MIN_DURATION } from './service.dto.js';

export const MIN_PACKAGE_SERVICES = 2;
export const MAX_PACKAGE_SERVICES = 10;
const COMMISSION_MODES = Object.values(CommissionMode);
const COMMISSION_MODE_DESCRIPTION = '`prorated`: o preço do pacote é rateado entre os serviços e cada um usa a sua comissão. `package`: comissão única sobre o preço do pacote.';

export class PackageListQueryDto extends ServiceCategoryListQueryDto { }

export class CreatePackageDto {
    @ApiProperty({ maxLength: 255, example: 'Corte + Barba' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({ type: String, nullable: true, example: 'Corte na tesoura com barba completa e toalha quente.' })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiProperty({ description: 'Preço do pacote em reais, até 2 casas decimais; pode diferir da soma dos serviços.', minimum: 0, maximum: MAX_PRICE, example: 75 })
    @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
    @Min(0)
    @Max(MAX_PRICE)
    price: number;

    @ApiProperty({
        description: `Duração estimada em minutos, só para exibição; a agenda bloqueia a soma das durações dos serviços. Múltiplo de ${DURATION_STEP}.`,
        minimum: MIN_DURATION,
        maximum: MAX_DURATION,
        multipleOf: DURATION_STEP,
        example: 60,
    })
    @IsInt()
    @Min(MIN_DURATION)
    @Max(MAX_DURATION)
    @IsDivisibleBy(DURATION_STEP)
    durationMinutes: number;

    @ApiPropertyOptional({ enum: COMMISSION_MODES, default: CommissionMode.PRORATED, description: COMMISSION_MODE_DESCRIPTION })
    @IsOptionalNotNull()
    @IsIn(COMMISSION_MODES)
    commissionMode?: CommissionMode;

    @ApiProperty({
        type: [String],
        format: 'uuid',
        description: `Serviços do negócio incluídos no pacote (${MIN_PACKAGE_SERVICES} a ${MAX_PACKAGE_SERVICES}, sem repetir).`,
        minItems: MIN_PACKAGE_SERVICES,
        maxItems: MAX_PACKAGE_SERVICES,
    })
    @IsArray()
    @ArrayMinSize(MIN_PACKAGE_SERVICES)
    @ArrayMaxSize(MAX_PACKAGE_SERVICES)
    @ArrayUnique()
    @IsUUID('all', { each: true })
    serviceIds: string[];

    @ApiPropertyOptional({ description: 'Ordem de exibição; omitida, vai para o fim.', minimum: 0, example: 0 })
    @IsOptionalNotNull()
    @IsInt()
    @Min(0)
    displayOrder?: number;

    @ApiPropertyOptional({ default: true })
    @IsOptionalNotNull()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdatePackageDto {
    @ApiPropertyOptional({ maxLength: 255, example: 'Corte + Barba' })
    @IsOptionalNotNull()
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({ type: String, nullable: true, description: '`null` remove a descrição.', example: 'Corte na tesoura com barba completa e toalha quente.' })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiPropertyOptional({ description: 'Preço do pacote em reais, até 2 casas decimais. Não altera agendamentos já feitos.', minimum: 0, maximum: MAX_PRICE, example: 75 })
    @IsOptionalNotNull()
    @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
    @Min(0)
    @Max(MAX_PRICE)
    price?: number;

    @ApiPropertyOptional({ description: `Duração estimada em minutos, só para exibição. Múltiplo de ${DURATION_STEP}.`, minimum: MIN_DURATION, maximum: MAX_DURATION, multipleOf: DURATION_STEP, example: 60 })
    @IsOptionalNotNull()
    @IsInt()
    @Min(MIN_DURATION)
    @Max(MAX_DURATION)
    @IsDivisibleBy(DURATION_STEP)
    durationMinutes?: number;

    @ApiPropertyOptional({ enum: COMMISSION_MODES, description: COMMISSION_MODE_DESCRIPTION })
    @IsOptionalNotNull()
    @IsIn(COMMISSION_MODES)
    commissionMode?: CommissionMode;

    @ApiPropertyOptional({
        type: [String],
        format: 'uuid',
        description: `Substitui a lista inteira de serviços (${MIN_PACKAGE_SERVICES} a ${MAX_PACKAGE_SERVICES}, sem repetir).`,
        minItems: MIN_PACKAGE_SERVICES,
        maxItems: MAX_PACKAGE_SERVICES,
    })
    @IsOptionalNotNull()
    @IsArray()
    @ArrayMinSize(MIN_PACKAGE_SERVICES)
    @ArrayMaxSize(MAX_PACKAGE_SERVICES)
    @ArrayUnique()
    @IsUUID('all', { each: true })
    serviceIds?: string[];

    @ApiPropertyOptional({ minimum: 0, example: 0 })
    @IsOptionalNotNull()
    @IsInt()
    @Min(0)
    displayOrder?: number;

    @ApiPropertyOptional({ description: 'Inativo some da página pública e não pode ser agendado online.' })
    @IsOptionalNotNull()
    @IsBoolean()
    isActive?: boolean;
}

export class PackageServiceDto {
    @ApiProperty({ format: 'uuid' })
    serviceId: string;

    @ApiProperty({ example: 'Corte masculino' })
    name: string;

    @ApiProperty({ description: 'Preço de tabela do serviço, em reais.', example: 50 })
    price: number;

    @ApiProperty({ description: 'Duração do serviço em minutos.', example: 30 })
    durationInMinutes: number;

    @ApiProperty({ description: 'Serviço inativo tira o pacote da página pública.' })
    isActive: boolean;

    static from(link: PackageServiceEntity): PackageServiceDto {
        const dto = new PackageServiceDto();
        dto.serviceId = link.service.id;
        dto.name = link.service.name;
        dto.price = link.service.price;
        dto.durationInMinutes = link.service.durationInMinutes;
        dto.isActive = link.service.isActive;
        return dto;
    }
}

export class PackageProfessionalDto {
    @ApiProperty({ format: 'uuid' })
    professionalId: string;

    @ApiProperty({ example: 'Paulo' })
    displayName: string;

    @ApiProperty({ type: Number, nullable: true, description: 'Comissão do profissional neste pacote em %; `null` usa a padrão dele.', example: 35 })
    commissionPercent: number | null;

    static from(link: ProfessionalPackageEntity): PackageProfessionalDto {
        const dto = new PackageProfessionalDto();
        dto.professionalId = link.professional.id;
        dto.displayName = link.professional.displayName;
        dto.commissionPercent = link.commissionPercent;
        return dto;
    }
}

export class PackageResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Corte + Barba' })
    name: string;

    @ApiProperty({ type: String, nullable: true, example: 'Corte na tesoura com barba completa e toalha quente.' })
    description: string | null;

    @ApiProperty({ description: 'Preço do pacote em reais.', example: 75 })
    price: number;

    @ApiProperty({ description: 'Soma dos preços de tabela dos serviços, para mostrar o desconto.', example: 90 })
    servicesPrice: number;

    @ApiProperty({ description: 'Duração estimada em minutos, só para exibição.', example: 60 })
    durationMinutes: number;

    @ApiProperty({ description: 'Soma das durações dos serviços: é o que a agenda bloqueia.', example: 60 })
    servicesDurationInMinutes: number;

    @ApiProperty({ enum: COMMISSION_MODES, description: COMMISSION_MODE_DESCRIPTION })
    commissionMode: CommissionMode;

    @ApiProperty({ example: 0 })
    displayOrder: number;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty({ type: [PackageServiceDto], description: 'Serviços do pacote em ordem de exibição.' })
    services: PackageServiceDto[];

    @ApiProperty({ type: [PackageProfessionalDto], description: 'Profissionais que atendem o pacote.' })
    professionals: PackageProfessionalDto[];

    @ApiProperty({ type: String, format: 'uri', nullable: true, description: 'URL da primeira imagem (capa); `null` se não houver.' })
    coverImageUrl: string | null;

    @ApiProperty({ format: 'date-time' })
    createdAt: Date;

    static from(pkg: PackageEntity): PackageResponseDto {
        const services = pkg.services.filter((link) => link.service);
        const dto = new PackageResponseDto();
        dto.id = pkg.id;
        dto.name = pkg.name;
        dto.description = pkg.description;
        dto.price = pkg.price;
        dto.servicesPrice = Math.round(services.reduce((total, link) => total + link.service.price, 0) * 100) / 100;
        dto.durationMinutes = pkg.durationMinutes;
        dto.servicesDurationInMinutes = services.reduce((total, link) => total + link.service.durationInMinutes, 0);
        dto.commissionMode = pkg.commissionMode;
        dto.displayOrder = pkg.displayOrder;
        dto.isActive = pkg.isActive;
        dto.services = services.map((link) => PackageServiceDto.from(link));
        dto.professionals = pkg.professionals.filter((link) => link.professional).map((link) => PackageProfessionalDto.from(link));
        dto.coverImageUrl = pkg.images?.[0] ? storageUrl(pkg.images[0].storageKey) : null;
        dto.createdAt = pkg.createdAt;
        return dto;
    }
}

export class PublicPackageServiceDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Corte masculino' })
    name: string;
}

export class PublicPackageDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Corte + Barba' })
    name: string;

    @ApiProperty({ type: String, nullable: true, example: 'Corte na tesoura com barba completa e toalha quente.' })
    description: string | null;

    @ApiProperty({ description: 'Preço do pacote em reais.', example: 75 })
    price: number;

    @ApiProperty({ description: 'Soma dos preços avulsos dos serviços, para mostrar a economia.', example: 90 })
    servicesPrice: number;

    @ApiProperty({ description: 'Duração estimada em minutos.', example: 60 })
    durationMinutes: number;

    @ApiProperty({ type: [PublicPackageServiceDto], description: 'Serviços incluídos, em ordem de exibição.' })
    services: PublicPackageServiceDto[];

    @ApiProperty({ type: [PublicServiceImageDto], description: 'Imagens em ordem de exibição; vazio se não houver.' })
    images: PublicServiceImageDto[];

    static from(pkg: PackageEntity): PublicPackageDto {
        const dto = new PublicPackageDto();
        dto.id = pkg.id;
        dto.name = pkg.name;
        dto.description = pkg.description;
        dto.price = pkg.price;
        dto.servicesPrice = Math.round(pkg.services.reduce((total, link) => total + link.service.price, 0) * 100) / 100;
        dto.durationMinutes = pkg.durationMinutes;
        dto.services = pkg.services.map((link) => ({ id: link.service.id, name: link.service.name }));
        dto.images = pkg.images.map((image) => PublicServiceImageDto.from(image));
        return dto;
    }
}
