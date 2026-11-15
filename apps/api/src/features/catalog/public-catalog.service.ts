import { Injectable } from '@nestjs/common';
import { BusinessesService } from '../businesses/index.js';
import { PublicPackageDto } from './dto/package.dto.js';
import { PublicCatalogResponseDto, PublicServiceCategoryDto, PublicServiceDto } from './dto/public-catalog-response.dto.js';
import { PackagesService } from './packages.service.js';
import { ServiceCategoriesService } from './service-categories.service.js';
import { ServicesService } from './services.service.js';

@Injectable()
export class PublicCatalogService {

    constructor(
        private readonly businesses: BusinessesService,
        private readonly categories: ServiceCategoriesService,
        private readonly services: ServicesService,
        private readonly packages: PackagesService,
    ) { }

    async getBySlug(slug: string): Promise<PublicCatalogResponseDto> {
        const business = await this.businesses.getActiveBySlug(slug);
        const [categories, services, packages] = await Promise.all([
            this.categories.list(business.id, { isActive: true }),
            this.services.list(business.id, { isActive: true }, { withImages: true }),
            this.packages.listBookableOnline(business.id),
        ]);

        const catalog = new PublicCatalogResponseDto();
        catalog.categories = categories
            .map((category) => PublicServiceCategoryDto.from(category, services.filter((s) => s.category?.id === category.id)))
            .filter((category) => category.services.length > 0);
        catalog.uncategorized = services.filter((s) => !s.category).map((s) => PublicServiceDto.from(s));
        catalog.packages = packages.map((p) => PublicPackageDto.from(p));
        return catalog;
    }
}
