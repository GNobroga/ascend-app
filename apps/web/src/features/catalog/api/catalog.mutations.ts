import { useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionQueries } from '@/features/subscriptions';
import type { CatalogImage, ImageOwner, Package, Service, ServiceCategory } from '../types';
import {
  catalogApi,
  type CreateCategoryRequest,
  type CreatePackageRequest,
  type CreateServiceRequest,
  type UpdateCategoryRequest,
  type UpdateImageRequest,
  type UpdatePackageRequest,
  type UpdateServiceRequest,
} from './catalog.api';
import { catalogQueries } from './catalog.queries';

type MutationCallbacks = {
  onError?: (error: Error) => void;
};

type UpdateServiceVariables = {
  serviceId: string;
  body: UpdateServiceRequest;
};

export const useCreateService = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateServiceRequest) => catalogApi.createService(businessId, body),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: catalogQueries.services(businessId).queryKey }),
        queryClient.invalidateQueries({ queryKey: subscriptionQueries.byBusiness(businessId).queryKey }),
      ]),
    onError,
  });
};

export const useUpdateService = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serviceId, body }: UpdateServiceVariables) => catalogApi.updateService(businessId, serviceId, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(catalogQueries.services(businessId).queryKey, (services: Service[] = []) =>
        services.map((service) => (service.id === updated.id ? updated : service)),
      );
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: catalogQueries.packages(businessId).queryKey }),
        queryClient.invalidateQueries({ queryKey: subscriptionQueries.byBusiness(businessId).queryKey }),
      ]);
    },
    onError,
  });
};

export const useDeleteService = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceId: string) => catalogApi.deleteService(businessId, serviceId),
    onSuccess: (_result, serviceId) => {
      queryClient.setQueryData(catalogQueries.services(businessId).queryKey, (services: Service[] = []) =>
        services.filter((service) => service.id !== serviceId),
      );
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: catalogQueries.packages(businessId).queryKey }),
        queryClient.invalidateQueries({ queryKey: subscriptionQueries.byBusiness(businessId).queryKey }),
      ]);
    },
  });
};

type ArrangeServicesVariables = {
  orderedServices: Service[];
  categoryChange?: {
    serviceId: string;
    categoryId: string | null;
  };
};

export const useArrangeServices = (businessId: string) => {
  const queryClient = useQueryClient();
  const { queryKey } = catalogQueries.services(businessId);

  return useMutation({
    mutationFn: async ({ orderedServices, categoryChange }: ArrangeServicesVariables) => {
      if (categoryChange) {
        await catalogApi.updateService(businessId, categoryChange.serviceId, { categoryId: categoryChange.categoryId });
      }
      await catalogApi.reorderServices(
        businessId,
        orderedServices.map(({ id }) => id),
      );
    },
    onMutate: async ({ orderedServices, categoryChange }) => {
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData(
        queryKey,
        orderedServices.map((service, index) => ({
          ...service,
          displayOrder: index,
          categoryId: service.id === categoryChange?.serviceId ? categoryChange.categoryId : service.categoryId,
        })),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useReorderCategories = (businessId: string) => {
  const queryClient = useQueryClient();
  const { queryKey } = catalogQueries.categories(businessId);

  return useMutation({
    mutationFn: (categories: ServiceCategory[]) =>
      catalogApi.reorderCategories(
        businessId,
        categories.map(({ id }) => id),
      ),
    onMutate: async (categories) => {
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData(
        queryKey,
        categories.map((category, index) => ({ ...category, displayOrder: index })),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
};

type UpdateCategoryVariables = {
  categoryId: string;
  body: UpdateCategoryRequest;
};

export const useCreateCategory = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateCategoryRequest) => catalogApi.createCategory(businessId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogQueries.categories(businessId).queryKey }),
    onError,
  });
};

export const useUpdateCategory = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId, body }: UpdateCategoryVariables) =>
      catalogApi.updateCategory(businessId, categoryId, body),
    onSuccess: (updated) =>
      queryClient.setQueryData(catalogQueries.categories(businessId).queryKey, (categories: ServiceCategory[] = []) =>
        categories.map((category) => (category.id === updated.id ? updated : category)),
      ),
    onError,
  });
};

export const useDeleteCategory = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryId: string) => catalogApi.deleteCategory(businessId, categoryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogQueries.all(businessId) }),
  });
};

type UpdatePackageVariables = {
  packageId: string;
  body: UpdatePackageRequest;
};

export const useCreatePackage = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreatePackageRequest) => catalogApi.createPackage(businessId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogQueries.packages(businessId).queryKey }),
    onError,
  });
};

export const useUpdatePackage = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ packageId, body }: UpdatePackageVariables) => catalogApi.updatePackage(businessId, packageId, body),
    onSuccess: (updated) =>
      queryClient.setQueryData(catalogQueries.packages(businessId).queryKey, (packages: Package[] = []) =>
        packages.map((item) => (item.id === updated.id ? updated : item)),
      ),
    onError,
  });
};

export const useDeletePackage = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (packageId: string) => catalogApi.deletePackage(businessId, packageId),
    onSuccess: (_result, packageId) =>
      queryClient.setQueryData(catalogQueries.packages(businessId).queryKey, (packages: Package[] = []) =>
        packages.filter((item) => item.id !== packageId),
      ),
  });
};

export const useReorderPackages = (businessId: string) => {
  const queryClient = useQueryClient();
  const { queryKey } = catalogQueries.packages(businessId);

  return useMutation({
    mutationFn: (packages: Package[]) =>
      catalogApi.reorderPackages(
        businessId,
        packages.map(({ id }) => id),
      ),
    onMutate: async (packages) => {
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData(
        queryKey,
        packages.map((item, index) => ({ ...item, displayOrder: index })),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
};

const ownerListKey = (businessId: string, owner: ImageOwner) =>
  owner.kind === 'services' ? catalogQueries.services(businessId).queryKey : catalogQueries.packages(businessId).queryKey;

export const useUploadImage = (businessId: string, owner: ImageOwner) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => catalogApi.uploadImage(businessId, owner, file),
    onSuccess: (image) => {
      queryClient.setQueryData(catalogQueries.images(businessId, owner).queryKey, (images: CatalogImage[] = []) => [
        ...images,
        image,
      ]);
      return queryClient.invalidateQueries({ queryKey: ownerListKey(businessId, owner) });
    },
  });
};

type UpdateImageVariables = {
  imageId: string;
  body: UpdateImageRequest;
};

export const useUpdateImage = (businessId: string, owner: ImageOwner, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ imageId, body }: UpdateImageVariables) => catalogApi.updateImage(businessId, owner, imageId, body),
    onSuccess: (updated) =>
      queryClient.setQueryData(catalogQueries.images(businessId, owner).queryKey, (images: CatalogImage[] = []) =>
        images.map((image) => (image.id === updated.id ? updated : image)),
      ),
    onError,
  });
};

export const useReorderImages = (businessId: string, owner: ImageOwner) => {
  const queryClient = useQueryClient();
  const { queryKey } = catalogQueries.images(businessId, owner);

  return useMutation({
    mutationFn: (images: CatalogImage[]) =>
      catalogApi.reorderImages(
        businessId,
        owner,
        images.map(({ id }) => id),
      ),
    onMutate: (images) => {
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, images);
      return { previous };
    },
    onError: (_error, _images, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ownerListKey(businessId, owner) }),
  });
};

export const useDeleteImage = (businessId: string, owner: ImageOwner) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageId: string) => catalogApi.deleteImage(businessId, owner, imageId),
    onSuccess: (_result, imageId) => {
      queryClient.setQueryData(catalogQueries.images(businessId, owner).queryKey, (images: CatalogImage[] = []) =>
        images.filter((image) => image.id !== imageId),
      );
      return queryClient.invalidateQueries({ queryKey: ownerListKey(businessId, owner) });
    },
  });
};
