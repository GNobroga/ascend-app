import { ApiProperty } from '@nestjs/swagger';
import type { ServiceCategoryEntity } from '../../../database/entities/service-category.entity.js';
import type { ServiceEntity } from '../../../database/entities/service.entity.js';
import { PublicPackageDto } from './package.dto.js';
import { PublicServiceImageDto } from './service-image.dto.js';

export class PublicServiceDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Corte masculino' })
    name: string;

    @ApiProperty({ type: String, nullable: true, example: 'Corte na tesoura ou máquina, com lavagem.' })
    description: string | null;

    @ApiProperty({ description: 'Duração em minutos.', example: 30 })
    durationInMinutes: number;

    @ApiProperty({ description: 'Preço em reais.', example: 49.9 })
    price: number;

    @ApiProperty({ type: [PublicServiceImageDto], description: 'Imagens em ordem de exibição; vazio se não houver.' })
    images: PublicServiceImageDto[];

    static from(service: ServiceEntity): PublicServiceDto {
        const dto = new PublicServiceDto();
        dto.id = service.id;
        dto.name = service.name;
        dto.description = service.description;
        dto.durationInMinutes = service.durationInMinutes;
        dto.price = service.price;
        dto.images = service.images.map((i) => PublicServiceImageDto.from(i));
        return dto;
    }
}

export class PublicServiceCategoryDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Cabelo' })
    name: string;

    @ApiProperty({ type: String, nullable: true, example: 'Cortes, escova e coloração.' })
    description: string | null;

    @ApiProperty({ type: [PublicServiceDto] })
    services: PublicServiceDto[];

    static from(category: ServiceCategoryEntity, services: ServiceEntity[]): PublicServiceCategoryDto {
        const dto = new PublicServiceCategoryDto();
        dto.id = category.id;
        dto.name = category.name;
        dto.description = category.description;
        dto.services = services.map((s) => PublicServiceDto.from(s));
        return dto;
    }
}

export class PublicCatalogResponseDto {
    @ApiProperty({ type: [PublicServiceCategoryDto], description: 'Categorias ativas com ao menos um serviço ativo, em ordem de exibição.' })
    categories: PublicServiceCategoryDto[];

    @ApiProperty({ type: [PublicServiceDto], description: 'Serviços ativos sem categoria.' })
    uncategorized: PublicServiceDto[];

    @ApiProperty({ type: [PublicPackageDto], description: 'Pacotes ativos cujos serviços estão todos ativos, em ordem de exibição.' })
    packages: PublicPackageDto[];
}
