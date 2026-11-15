import { PackageImagesController } from './package-images.controller.js';
import { PackageImagesService } from './package-images.service.js';
import { PackagesController } from './packages.controller.js';
import { PackagesService } from './packages.service.js';
import { PublicCatalogController } from './public-catalog.controller.js';
import { PublicCatalogService } from './public-catalog.service.js';
import { ServiceCategoriesController } from './service-categories.controller.js';
import { ServiceCategoriesService } from './service-categories.service.js';
import { ServiceImagesController } from './service-images.controller.js';
import { ServiceImagesService } from './service-images.service.js';
import { ServicesController } from './services.controller.js';
import { ServicesService } from './services.service.js';

export { ServicesService } from './services.service.js';
export { ServiceCategoriesService } from './service-categories.service.js';
export { PackagesService } from './packages.service.js';

export const catalogControllers = [
    ServiceCategoriesController,
    ServicesController,
    ServiceImagesController,
    PackagesController,
    PackageImagesController,
    PublicCatalogController,
];
export const catalogProviders = [ServiceCategoriesService, ServicesService, ServiceImagesService, PackagesService, PackageImagesService, PublicCatalogService];
