import { api } from '@/shared/api/http';
import type { CatalogImage, CommissionMode, ImageOwner, Package, Service, ServiceCategory } from '../types';

export type CreateServiceRequest = {
  name: string;
  description: string | null;
  durationInMinutes: number;
  price: number;
  categoryId: string | null;
  isActive: boolean;
};

export type UpdateServiceRequest = Partial<CreateServiceRequest>;

export type CreateCategoryRequest = {
  name: string;
  description: string | null;
  isActive: boolean;
};

export type UpdateCategoryRequest = Partial<CreateCategoryRequest>;

export type CreatePackageRequest = {
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  commissionMode: CommissionMode;
  serviceIds: string[];
  isActive: boolean;
};

export type UpdatePackageRequest = Partial<CreatePackageRequest>;

export type UpdateImageRequest = {
  altText: string | null;
};

const imagesPath = (businessId: string, owner: ImageOwner) =>
  `/businesses/${businessId}/${owner.kind}/${owner.id}/images`;

const toImageForm = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return form;
};

export const catalogApi = {
  listServices: (businessId: string) => api.get<Service[]>(`/businesses/${businessId}/services`),
  createService: (businessId: string, body: CreateServiceRequest) =>
    api.post<Service>(`/businesses/${businessId}/services`, body),
  updateService: (businessId: string, serviceId: string, body: UpdateServiceRequest) =>
    api.patch<Service>(`/businesses/${businessId}/services/${serviceId}`, body),
  deleteService: (businessId: string, serviceId: string) =>
    api.delete<void>(`/businesses/${businessId}/services/${serviceId}`),
  reorderServices: (businessId: string, ids: string[]) =>
    api.put<void>(`/businesses/${businessId}/services/order`, { ids }),
  listCategories: (businessId: string) =>
    api.get<ServiceCategory[]>(`/businesses/${businessId}/service-categories`),
  createCategory: (businessId: string, body: CreateCategoryRequest) =>
    api.post<ServiceCategory>(`/businesses/${businessId}/service-categories`, body),
  updateCategory: (businessId: string, categoryId: string, body: UpdateCategoryRequest) =>
    api.patch<ServiceCategory>(`/businesses/${businessId}/service-categories/${categoryId}`, body),
  deleteCategory: (businessId: string, categoryId: string) =>
    api.delete<void>(`/businesses/${businessId}/service-categories/${categoryId}`),
  reorderCategories: (businessId: string, ids: string[]) =>
    api.put<void>(`/businesses/${businessId}/service-categories/order`, { ids }),
  listPackages: (businessId: string) => api.get<Package[]>(`/businesses/${businessId}/packages`),
  createPackage: (businessId: string, body: CreatePackageRequest) =>
    api.post<Package>(`/businesses/${businessId}/packages`, body),
  updatePackage: (businessId: string, packageId: string, body: UpdatePackageRequest) =>
    api.patch<Package>(`/businesses/${businessId}/packages/${packageId}`, body),
  deletePackage: (businessId: string, packageId: string) =>
    api.delete<void>(`/businesses/${businessId}/packages/${packageId}`),
  reorderPackages: (businessId: string, ids: string[]) =>
    api.put<void>(`/businesses/${businessId}/packages/order`, { ids }),
  listImages: (businessId: string, owner: ImageOwner) => api.get<CatalogImage[]>(imagesPath(businessId, owner)),
  uploadImage: (businessId: string, owner: ImageOwner, file: File) =>
    api.post<CatalogImage>(imagesPath(businessId, owner), toImageForm(file)),
  updateImage: (businessId: string, owner: ImageOwner, imageId: string, body: UpdateImageRequest) =>
    api.patch<CatalogImage>(`${imagesPath(businessId, owner)}/${imageId}`, body),
  reorderImages: (businessId: string, owner: ImageOwner, ids: string[]) =>
    api.put<void>(`${imagesPath(businessId, owner)}/order`, { ids }),
  deleteImage: (businessId: string, owner: ImageOwner, imageId: string) =>
    api.delete<void>(`${imagesPath(businessId, owner)}/${imageId}`),
};
